# gmail-github-filters
Google Apps Script for filtering GitHub emails.

## Installation
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

## Development
Run the following command to build and deploy to GAS.
```shell
npm run watch
```
(Other commands in `package.json`)
