# CLAUDE.md

Guidance for Claude (or any agent) working in this repo. These notes are temporary: the owner plans to delete them once the pending work below is done or dropped.

## What this is

Takotsubo is a Gmail filtering engine that runs as Google Apps Script (GAS). TypeScript is compiled with `tsc` to `dist/` and pushed with `clasp`. A time-driven GAS trigger runs `run` every minute. Rules live in `src/lib/filters.ts` as filter sets (a search query plus filters).

## Commands

- `npm run build`: `tsc` plus copy `appsscript.json` to `dist/`
- `npm run lint` / `npm run lint:fix`
- `npm test`: build, type-check the tests, run them with `node --test`
- `npm run deploy`: `clasp push -f` to the live script. Never run it; the owner deploys.

Tests run the built `dist/` code in Node against fakes. They cannot show real GAS behavior (quotas, timing, actual search), so say plainly when something was not run in GAS.

## Working rules

- Do not run `npm run deploy` or `clasp push`.
- Do not touch the owner's Gmail from this repo's tooling. The engine runs only inside GAS.
- Ask before changing the behavior of an existing filter rule. The rules encode how the owner triages mail.
- Run `npm test` and `npm run lint` before handing code back. Add a rule test when adding or changing a rule.
- Keep code short and readable; propose before adding abstractions.
- Avoid em-dashes in docs and comments. Use commas, colons, or parentheses.
- `config.ts` holds a real username and team slug. Keep install-specific values out of anything that may become public.

## GAS constraints

- **No module system** (`"module": "none"`): no `import` or `export`; every file shares one global scope. Never construct a class or call another file's code at the top level of a file.
- **The editor lists every top-level function** as runnable. Keep helpers in the `util` object; keep `dryRun` first in `index.ts` so it is the default.
- **Target es2021** with `useDefineForClassFields`: use TypeScript `private`, never `#field`. `strict` is off, so initialize fields.
- **Time limit:** a run is killed at about 6 minutes; the engine stops between threads at 5.
- **Measured behavior** (2026-10-22, from the script editor):
  - Message getters (`getId`, `getFrom`, `getCc`, `getSubject`): about 1 ms. `getPlainBody`: about 60 ms the first time, then cached by GAS.
  - `getMessages`: about 200 ms per thread. `getLabels`: about 0.25 ms. `isInInbox`: about 50 ms the first time.
  - Adding a label the thread already has: about 420 ms. Any move, even to where it already is: about 250 ms. Hence the skipped no-op writes.
  - `GmailApp.search` throws if `max` is above 500. It returns threads newest first.
  - Search matches per message, not per thread (`-in:inbox` can match a thread that is in the inbox).
  - `after:N` includes second N. `after:0` matches nothing; `after:1` works.
  - Message dates come from the `Date` header; search uses the receive time (0 to 2 seconds later).
  - `moveToInbox()` takes a thread out of the trash.
  - The script lock is released when a run dies, and it blocks a second run (verified live: `debug` was refused during a trigger run).

## Design rules

1. **The thread is the unit of state.** On a new message, every message in the thread is replayed oldest first; labels act as state (Queued, Merged, Closed, Reopened).
2. **Mute** means never move back to the inbox (`ifNotHasLabelsAny: [Muted]`).
3. **Archive** means "acknowledged, but tell me about state changes". A thread archived by hand stays archived until a new message arrives.
4. **Filters are code** and must stay readable. No JSON or rule language.
5. **No filter logic in search queries.** A query only picks candidate threads.
6. **Non-destructive by default.** Trash only where a rule says so; never permanently delete.

## Future work

### Time-based filter sets

First planned use: a GitHub cleanup set (stale bot PRs, the original half of renamed PRs, anything forgotten in the inbox). Another example: "trash Marketing after 7 days" (`in:inbox label:Marketing older_than:7d`). Such a set cannot use `after:`, needs no cursor or recent-message ids, and probably should not replay messages, since its rules are about age, not thread history. Options: a `checkpoint: false` field on `FilterSet`, or a separate filter type for these sets. Decide when the first real rule exists. Beware actions that leave the thread matching the query (it would be processed every run).

### Labels per filter set

`LabelName` and `ensureLabels` cover only the GitHub labels. A second set with its own labels needs them added to `LabelName`, or a label list per set.

### Rule sets per install (undecided)

The owner wants separate rule sets for different Gmail accounts (work vs personal), never mixed into one deployed script, with install-specific data kept out of this repo if it may become public. Layouts discussed: `installs/<name>` in this repo, private repos as submodules or gitignored clones, npm git dependencies. None chosen. Do not implement without a decision.

### Testing

- `test/gas/` is a small GAS testing library: a `vm` loader (one shared scope, classes and consts readable, a fake clock) and stateful fakes for GmailApp, PropertiesService, LockService, Session, Utilities and console. It imports nothing from Takotsubo, so it can move to its own package. The owner may make it public and share it with a Sheets app.
- Grow the fakes only as code needs them. Unsupported calls should throw `Not implemented`. Mark behavior as measured only when it was checked in real GAS.
- Ideas: stubs for every service generated from `@types/google-apps-script`; conformance tests run against both a fake and real GAS; support for `.clasp.json` `filePushOrder`.
- Fixtures in `test/github.mts` are written to match real GitHub mail, not copied from it. Replace them with cleaned-up real samples when a rule misses.

### Watching live runs

- Rule misses on the Socket inbox. Diagnose with `dryRun()` logs and the end-of-run summary.
- Whether Merged should archive Direct Review threads. It trashes the thread unless it has Author or Direct Review, and those stay where they are.
- Renamed PRs start a new Gmail thread, so labels do not carry over. The new thread lacks Direct Review or Team Review, so Merged or Closed trashes it while the original stays in the inbox (seen on depscan#28421). A fix would key state on repo and PR number, both in the subject, and sync labels across threads that share them. Deferred in favor of the time-based cleanup.
- The CI "run cancelled" subject format is unconfirmed (no real example yet).
