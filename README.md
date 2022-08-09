# Remember Me
firebase based project

## Dev init
Before developing make sure to run:
- `npm install`
- `npm install ./functions`
- `gcloud auth application-default login`
- `production: gcloud config set project remember-me-3`
- `dev: gcloud config set project remember-me-dev`
-  `firebase login --reauth`

## Dev use
- `npm run start`
- `npm run serve:functions`

## Deploy hosting
- `npm run build:hosting:prod`
- from public
  - in html/index.html add nonce to scripts, remove onload on link style and change media to all, remove noscript tag
  - `gcloud builds submit --tag gcr.io/remember-me-4/web-site`
  - `gcloud run deploy --image gcr.io/remember-me-4/web-site`


## Deploy functions
- `npm run deploy:functions`
