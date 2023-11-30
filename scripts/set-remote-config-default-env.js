const dotenv = require('dotenv');
const colors = require('colors');
const path = require('path');
const fs = require('fs');

const basePath = path.join(__dirname, '../');

const DOTENV_PATH = path.join(basePath, '.env.remote-config-default');
const DOTENV_PROD_PATH = path.join(basePath, '.env.remote-config-default.prod');
const writeFileSync = require('fs').writeFileSync;

const getEnvironmentString = () => {
  return `{
    "guestComponent": "${process.env.GUEST_COMPONENT}",
    "roundsSetTimesOfDayOrderUrl": "${process.env.ROUNDS_SET_TIMES_OF_DAY_ORDER_URL}",
    "authGetTokenWithSecretKeyUrl": "${process.env.AUTH_GET_TOKEN_WITH_SECRET_KEY_URL}",
    "roundsDeleteTaskUrl": "${process.env.ROUNDS_DELETE_TASK_URL}",
    "roundsDeleteRoundUrl": "${process.env.ROUNDS_DELETE_ROUND_URL}",
    "roundsSaveRoundUrl": "${process.env.ROUNDS_SAVE_ROUND_URL}",
    "userUploadProfileImageUrl": "${process.env.USER_UPLOAD_PROFILE_IMAGE_URL}",
    "roundsSaveTaskUrl": "${process.env.ROUNDS_SAVE_TASK_URL}",
    "roundsSetRoundsOrderUrl": "${process.env.ROUNDS_SET_ROUNDS_ORDER_URL}"
  }`;
};

const createFoldersAllTheWayDown = (filePath) => {
  const folders = filePath.split(/\\|\//).slice(0, -1);
  folders.reduce((acc, folder) => {
    const folderPath = path.join(acc, folder, '/');
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }
    return folderPath
  }, '');
};

const paths = [{
  dotenvPath: DOTENV_PATH, remoteConfigPath: path.join(basePath, 'src/assets/remote-config-default.json')
}, {
  dotenvPath: DOTENV_PROD_PATH, remoteConfigPath: path.join(basePath, 'src/assets/remote-config-default-prod.json')
}];

for (const path of paths) {
  dotenv.config({path: path.dotenvPath, override: true});

  const envConfigFile = getEnvironmentString();

  createFoldersAllTheWayDown(path.remoteConfigPath);

  writeFileSync(path.remoteConfigPath, envConfigFile, (err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    } else {
      console.log(colors.magenta(`Firebase remote config file generated correctly at ${path.remoteConfigPath}`));
    }
  });
}
