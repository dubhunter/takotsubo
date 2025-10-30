# takotsubo
_(Traditional Japanese ~~Octocat~~ Octopus Trap)_

Gmail filters are great for what they _can_ do, but there are some things they cannot (compound rules/actions, special character matching, etc.).

Enter Takotsubo, a powerful email filtering engine tailored for GitHub notifications.

## Features (Goals)
- Regular Expression matching.
- Exact string matching.
- Special character handling.
- Compound and/or rules & actions.
- Automatically create labels in Gmail.
- Try not to be destructive.
- Preserve the Inbox for stuff that _actually_ deserves your attention.

### General Flow
- Gmail will label and archive _all_ GH emails.
- Takotsubo will run every minute (configurable), and evaluate all filters.
- When a filter matches the rule, it will run the "action" which may label/un-label, archive/un-archive, or move to trash.
- That's it!

### Current Labels ([source](https://github.com/dubhunter/takotsubo/blob/master/src/lib/types.ts#L5))
- GH
- GH/Approved
- GH/Author
- GH/CI
- GH/Closed
- GH/Direct Review
- GH/Mention
- GH/Merged
- GH/Queued
- GH/Team Review

## (Local) Installation
```shell
npm install -g @google/clasp
npm -i
```

## (First) Deployment
### Setup Project/Clasp
- [Create Apps Script Project](https://script.google.com/home)
- Get the `Script ID` from "Project Settings"
- Add `Script ID` to `.clasp.json`
- Run `clasp login` in CLI

### Configure App
- Edit `src/lib/config.ts` (change `usernameUser` & `usernameTeam`)

### Deploy
```shell
npm run build
npm run deploy
```

### Configure Trigger
- Go to "Triggers" (In GAS UI)
- Add Trigger
  - Function: `run`
  - Event source: `Time-driven`
  - Type: `Minutes timer`
  - Interval: `Every minute`
  - Failure notifications: `Notify me immediately`
  - `Save`

### Configure Gmail
(The above should have created all the Labels)

We just need one Filter (apply to existing matches)
- Matches: `from:(@github.com)`
- Do this: `Skip Inbox, Apply label "GH"`

## Development (PRs Welcome)
Run the following command to build and deploy to GAS.
```shell
npm run watch
```
(Other commands in `package.json`)
