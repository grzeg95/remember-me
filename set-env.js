const dotenv = require('dotenv');
const colors = require('colors');
const path = require('path');
const fs = require('fs');

const DOTENV_PATH = path.join(__dirname, '.env');
const DOTENV_PROD_PATH = path.join(__dirname, '.env.prod');
const writeFileSync = require('fs').writeFileSync;

const getEnvironmentString = () => {
  return `export const environment = {
  production: ${process.env.PRODUCTION},
  firebase: {
    projectId: '${process.env.FIREBASE_PROJECT_ID}',
    appId: '${process.env.FIREBASE_APP_ID}',
    locationId: '${process.env.FIREBASE_LOCATION_ID}',
    apiKey: '${process.env.FIREBASE_API_KEY}',
    authDomain: '${process.env.FIREBASE_AUTH_DOMAIN}'
  },
  recaptcha: '${process.env.RECAPTHA}',
  emulators: {
    firestore: {
      host: '${process.env.FIREBASE_EMULATORS_FIRESTORE_HOST}',
      port: ${process.env.FIREBASE_EMULATORS_FIRESTORE_PORT},
      protocol: '${process.env.FIREBASE_EMULATORS_FIRESTORE_PROTOCOL}'
    },
    functions: {
      host: '${process.env.FIREBASE_EMULATORS_FUNCTIONS_HOST}',
      port: ${process.env.FIREBASE_EMULATORS_FUNCTIONS_PORT},
      protocol: '${process.env.FIREBASE_EMULATORS_FUNCTIONS_PROTOCOL}'
    },
    auth: {
      host: '${process.env.FIREBASE_EMULATORS_AUTH_HOST}',
      port: ${process.env.FIREBASE_EMULATORS_AUTH_PORT},
      protocol: '${process.env.FIREBASE_EMULATORS_AUTH_PROTOCOL}'
    }
  }
};`;
};

const createFoldersAllTheWayDown = (filePath) => {
  const folders = filePath.split('/').slice(0, -1);
  folders.reduce((acc, folder) => {
    const folderPath = acc + folder + '/';
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }
    return folderPath
  }, '');
};

const paths = [{
  dotenvPath: DOTENV_PATH, environmentPath: './src/environments/environment.ts'
}, {
  dotenvPath: DOTENV_PROD_PATH, environmentPath: './src/environments/environment.prod.ts'
}];

for (const path of paths) {
  dotenv.config({path: path.dotenvPath, override: true});

  const envConfigFile = getEnvironmentString();

  createFoldersAllTheWayDown(path.environmentPath);

  writeFileSync(path.environmentPath, envConfigFile, (err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    } else {
      console.log(colors.magenta(`Angular environment.ts file generated correctly at ${path.environmentPath}`));
    }
  });
}
