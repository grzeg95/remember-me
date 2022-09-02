# Remember Me
firebase based project

## Dev init
Before developing make sure to:
- run: `npm install`
- run: `npm install ./functions`
- run from cmd: `firebase login --reauth`
- add `GOOGLE_APPLICATION_CREDENTIALS` environment variable `*.json` path to `serve:emulators`

## Dev use
- `npm run serve:angular`
- `npm run serve:emulators`

## Deploy hosting
- `npm run build:hosting:static`
- `npm run build:hosting:image`
- `npm run deploy:hosting:image`

## Deploy functions
- `npm run deploy:functions`
