# Remember Me
Firebase based project.

Create separate prod and dev projects for Firebase and Google Cloud KMS. Be ready for additional costs and learn heavily more about billings. Configure Service accounts. Create and configure Cookiebot account. Buy domain name or use that was provided by Firebase project. Set DNS and what? Keep hacking 🧐

### Official website
https://rem.grzeg.pl

## Dev init
Before developing make sure to:
- install the gcloud CLI
- run: `npm install`
- run: `npm install ./functions`
- run: `npm install ./firebase-unit-tests/functions`
- run: `npm install ./firebase-unit-tests/security-rules`
- run: `npm install ./firebase-admin`
- run from cmd: `firebase login --reauth`
- add `FOR_FIREBASE_EMULATOR=1` environment variable to `serve:emulators`
- add `GOOGLE_APPLICATION_CREDENTIALS` environment variable `*.json` path to `serve:emulators`
- in `.firebaserc` use `default` as `prod` and `dev` for dev projects
- in `firebase-unit-tests` 'indexes.ts' replace `FIREBASE_DEV_PROJECT_ID`
- in `package.json` for `hosting` use Cloud Run PROJECT_ID, SERVICE_NAME, and REGION_ID
- in `./public/nginx.conf` replace `CLOUD_FUNCTIONS_SUBDOMAIN` with provided by Google. This is `region-id`-`project-id`
- in `./public/nginx.conf` replace `FIREBASE_PROJECT_ID`
- in `./public/nginx.conf` replace `CLOUD_FUNCTIONS_V2_CUSTOM_DOMAIN` with provided in console cloud run domain mappings
- in `index.html` replace `DATA-CBID` for Cookiebot
- create and fill `.evn.hosting` and `.env.hosting.prod` for corresponding variables in `set-env.js`
- create and fill `.evn.remote-config-default` and `.env.remote-config-default.prod` for corresponding variables in `set-remote-config-default-env.js`
- create and fill `.evn.functions` and `.env.functions.prod` into `functions` folder for corresponding variables in `./functions/src/config.ts`
- for firebase-admin add `GOOGLE_APPLICATION_CREDENTIALS` environment variable `*.json` path to `start:firebase-admin`
- reuse `.evn.functions.prod` for firebase-admin

## Dev use
- `npm run serve:angular`
- `npm run build:functions:dev`
- `npm run serve:emulators`

## Deploy hosting
- `npm run build:hosting:static`
- `npm run build:hosting:image`
- `npm run deploy:hosting:image`

## Deploy functions
- `npm run deploy:functions`
