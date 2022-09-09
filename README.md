# Remember Me
Firebase based project.

Create separate prod and dev projects for Firebase and Google Cloud KMS. Be ready for additional costs and learn heavily more about billings. Configure Service accounts and what? Keep hacking 🧐

## Dev init
Before developing make sure to:
- run: `npm install`
- run: `npm install ./functions`
- run: `npm install ./firebase-unit-tests/functions`
- run: `npm install ./firebase-unit-tests/security-rules`
- run from cmd: `firebase login --reauth`
- install `Install the gcloud CLI`
- add `FIREBASE_PROJECT_ID=SOME_DEV_PROJECT_ID` environment variable to `serve:emulators`
- add `GOOGLE_APPLICATION_CREDENTIALS` environment variable `*.json` path to `serve:emulators`
- add `FOR_FIREBASE_EMULATOR=0` and `PROJECT_ID_FIREBASE=SOME_PROD_PROJECT_ID` environment variable to `deploy:functions` and `deploy:prod` in functions
- in `.firebaserc` use `default` as `prod` and `dev` for dev projects
- in `firebase-unit-tests` 'indexes.ts' replace `FIREBASE_DEV_PROJECT_ID`
- in `package.json` for `hosting` use Cloud Run PROJECT_ID, SERVICE_NAME, and REGION_ID

## Dev use
- `npm run serve:angular`
- `npm run serve:emulators`

## Deploy hosting
- `npm run build:hosting:static`
- `npm run build:hosting:image`
- `npm run deploy:hosting:image`

## Deploy functions
- `npm run deploy:functions`
