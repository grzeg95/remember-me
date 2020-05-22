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

##Dev use
- `npm run start`
- `npm run serve:functions`

##Deploy hosting
- `npm run deploy:hosting`


##Deploy functions
- `npm run deploy:functions`
