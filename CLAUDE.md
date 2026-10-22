# CLAUDE.md

Guidance for Claude (or any agent) working in this repo. Read this before changing code.

## What this is

Takotsubo is a Gmail filtering engine that runs as Google Apps Script (GAS). It does what Gmail's own filters cannot: regex matching, compound rules and actions, state derived from a whole thread. It was built for GitHub notifications and is being generalized.

TypeScript is compiled with `tsc` to `dist/` and pushed with `clasp`. A time-driven GAS trigger runs `run` every minute.

## Commands

- `npm run build`: `tsc` plus copy `appsscript.json` to `dist/`
- `npm run deploy`: `clasp push -f` (pushes to the live script; never run without being asked)
- `npm run watch`: build, manifest copy, and deploy in watch mode
- `npm run lint` / `npm run lint:fix`
- `.clasp.json` holds the target `scriptId` and `rootDir: ./dist`

There is no test runner. GAS cannot be run locally, so type-check with `npm run build` and lint. Keep logic that does not touch GAS services (cursor math, ordering, selection) in pure functions so it can be tested in Node.

## GAS constraints (important)

- **No module system.** `tsconfig` has `"module": "none"`. There is no `import` or `export`. Every file shares one global scope. Do not add imports or exports.
- **Load order and classes.** Files evaluate in sequence at load time (clasp pushes alphabetically unless `filePushOrder` is set; this was not verified). Function declarations are usable early, but `class` and `const` are not. Never construct a class or call another file's code at the top level of a file. Build objects inside the entry functions (`run`, `debug`, ...).
- **Eager service calls cost real time.** Do not make them in constructors that run for every item in a large list. Measured 2026-10-22 (50 messages, from the script editor):
  - `getId`, `getFrom`, `getCc`, `getSubject`: about 1 ms per call, first or repeat. Loaded with the message; not service calls.
  - `getPlainBody`: about 60 ms on the first call per message, about 2 ms on repeats. GAS caches it on the `GmailMessage` object.
  - `search` of 20 threads plus `getMessages` took several seconds (not timed precisely).
  - `getLabels`, `getThread`, `getUserLabels`, label add and remove: unmeasured.
- **Target es2021** with `useDefineForClassFields`, required until GAS supports private class fields. Use the TypeScript `private`/`protected` keyword, never `#field`.
- **`strict` is off.** A bare field declaration (`protected x: Foo;`) compiles but is `undefined` at runtime until assigned. Initialize fields where declared or in the constructor.
- **Time limit.** One execution is killed at about 6 minutes. Daily trigger runtime is limited (90 min consumer, 6 hr Workspace). PropertiesService allows 50,000 reads and writes per day on consumer accounts (500,000 on Workspace), 9 KB per value.
- **`GmailApp.search`** returns threads newest-first (by last message). Use `search(query, start, max)` to page. The per-call maximum is believed to be 500 but is not confirmed in the docs.
- Time-driven triggers can overlap. A run lock is required (see decisions).

## Layout

```
src/index.ts            GAS entry points: run, debug, ensureLabels, listFilters
src/lib/takoApp.ts      TakoApp: label map, cursor (UserProperties), search, ensureLabels, processNewMessages
src/lib/takoThread.ts   TakoThread: wraps GmailThread; per-thread label Set; add/remove label; archive/inbox/trash moves
src/lib/takoMessage.ts  TakoMessage: wraps GmailMessage; matchers (from/cc/subject/body); delegates label and move actions to its thread
src/lib/filters.ts      the filter rules (design goal: stay readable)
src/lib/types.ts        LabelName enum, UserProp, GmailFilter, UserConfig, MoveActionOptions
src/lib/config.ts       per-user config (usernames, notification addresses)
src/lib/util.ts         stringContains
```

The wrapper split (TakoApp / TakoThread / TakoMessage) came from the owner's PR #1. Check whether it has merged and what the code looks like now before assuming this layout. Messages reach the app through `message.thread.app`; only `TakoThread` is given the app directly.

## Design rules the owner has decided

1. **The thread is the unit of state.** When a thread gets a new message, evaluate all of its messages in chronological order. The rules form a small state machine over the conversation (Queued, UnQueued, Merged, Closed, Reopened). Replaying old messages is intended, not a bug.
2. Every message is processed at least once. Every thread is processed at least once, and again on any new message.
3. **Mute** means "never move this back to the inbox, whatever other rules say." It is implemented as `ifNotHasLabelsAny: [Muted]` on inbox moves.
4. **Archive** means "I have acknowledged the current state, but tell me about state changes." New activity may bring a thread back to the inbox. Mute is the override.
5. Filters are code, and readability is a primary goal. Keep rule bodies short and declarative. Do not turn them into JSON or a rule language.
6. No filter logic in search queries. A search only scopes which threads are candidates. What happens to a message is decided in `filters.ts`.
7. Be non-destructive by default. Trash only where a rule says so. Never permanently delete.

## Decisions made (do not relitigate without asking)

- **Wrapped Gmail objects, dependency injection.** `TakoApp` is created once per run and passed down through `TakoThread`. It is not a singleton (a singleton brings back global state and hurts testing). A static factory or private constructor is fine if the owner wants it.
- **Build wrappers lazily.** Wrap a thread when the loop reaches it. Do not wrap or load labels for every search result up front, and do not keep every wrapper alive for the whole run (memory in large backlogs).
- **Memoize reads, write through mutations.** The per-thread label Set must be updated by every add and remove, so guards see labels added earlier in the same replay. All label changes go through `TakoThread`. Add and remove skip the API call when the label is already in the right state. Caches live for one run only.
- **No bulk `getMessagesForThreads`.** Rejected as complexity for little gain. Use `thread.getMessages()` per thread.
- **Search paging.** One simple loop: call `search(query, start, PAGE_SIZE)`, append, stop on a partial page. Page size: try 500 and log the first page's length on a large result. If it comes back short of 500 while more exist, the cap is lower, so fall back to exit-on-empty-page (one extra call, cannot truncate). Then **reverse** the list for oldest-first. Do not sort.
- **Dedupe is optional.** A boundary thread can repeat if mail arrives mid-paging. If deduping, use a `Set<string>` of thread ids alongside the array (a Set of thread objects does not dedupe). `getId()` is not a service call (measured), so this is cheap. Replaying a thread twice is harmless (idempotent), so skipping dedupe is acceptable.
- **Cursor lives in PropertiesService, not CacheService** (cache entries expire and can be evicted). Read the cursor once at the start of the run, keep it in a local variable, write once per fully processed thread. Never move the cursor backward: `cursor = max(cursor, thread.getLastMessageDate())`. Drop the `lastMessageId` skip; it omits one message from a replay and does not fit the thread model. GH keeps the existing `LAST_MESSAGE_*` keys (no migration).
- **Run lock.** `LockService.getScriptLock()` with `tryLock(0)`; skip the tick if a run is in progress. Wrap both `run` and `debug` (debug resets the cursor):
  ```ts
  function withScriptLock(work: () => void): void {
      const lock = LockService.getScriptLock();
      if (!lock.tryLock(0)) { console.info('Another run is in progress, skipping this tick.'); return; }
      try { work(); } finally { lock.releaseLock(); }
  }
  ```
- **Deadline.** Stop between threads at about 5 minutes and save the cursor, so a backlog resumes cleanly on the next tick.
- **Triggers (planned shape).** `type Trigger = { name: string; query: string; filters: GmailFilter[] }`. Rename the filter array to `ghFilters` (bodies unchanged) and add `const triggers: Trigger[] = [{ name: 'GH', query: 'label:GH', filters: ghFilters }]` in `filters.ts`. `TakoApp` loops over `triggers`; checkpoints are keyed per trigger. Time-based "stateful" triggers (for example `in:inbox label:X older_than:7d`) need no cursor if their actions remove the thread from the query. Beware actions that leave the thread matching.
- **Parallelism:** not needed now. If ever wanted, use one installed time-driven trigger per Trigger, not an orchestrator spawning workers.

## Remaining work, in order

1. **Move the search into `filters.ts`** (the Trigger wrapper above).
2. **Cursor and loop fixes:** page the search, reverse to oldest-first, replay each thread chronologically, advance the cursor per thread, deadline, run lock, remove the `lastMessageId` skip.
3. **Later:** time-based triggers (for example "trash Marketing after 7 days"), and per-install rule sets.

Done: the PR #1 review findings (app built inside entry points, threads wrapped when reached, case-insensitive label names, `private` members). Dropped: memoizing message fields, since GAS already caches them (see the measurements above).

Keep these as separate small commits.

## Per-install rules (undecided)

The owner wants separate rule sets for different Gmail accounts (work vs personal), never mixed into one deployed script, and install-specific data kept out of this repo if it may become public. Layouts discussed: install files in `installs/<name>` of this repo; private repos as git submodules or gitignored clones; npm git dependencies. The owner did not like any of them yet. **Do not implement anything here without a decision.**

## Known issues

- `Reopened` filter: `new RegExp('Reopened #[0-9]+\\./')` has a stray `/` after the escaped period, so it only matches text like `Reopened #123./`. Probably a typo that stops the rule firing. Confirm with the owner before changing.
- `config.ts` holds a real username and team slug. Keep install-specific values out of anything that may become public.

## Working rules for agents

- Do not run `npm run deploy` or `clasp push`. The owner deploys.
- Do not touch the owner's Gmail from this repo's tooling. The engine runs only inside GAS.
- Ask before changing the behavior of an existing filter rule. The rules encode how the owner triages mail.
- Run `npm run build` and `npm run lint` before handing code back. The type-check is the only automated verification available. Say plainly that GAS behavior (paging, locks, quotas) was not run.
- The owner prefers short, readable code and has pushed back on over-engineering (for example, bulk fetching was rejected). Propose, explain briefly, and ask before adding abstractions.
- Avoid em-dashes in docs and comments the owner will read. Use commas, colons, or parentheses.
