const dotenv = require('dotenv');
const colors = require('colors');
const path = require('path');
const fs = require('fs');

const DOTENV_PATH = path.join(__dirname, '.env.remote-config-default');
const DOTENV_PROD_PATH = path.join(__dirname, '.env.remote-config-default.prod');
const writeFileSync = require('fs').writeFileSync;

const getEnvironmentString = () => {
  return `{
    "guestComponent": "${process.env.GUEST_COMPONENT}",
    "setTimesOfDayOrderUrl": "${process.env.SET_TIMES_OF_DAY_ORDER_URL}",
    "getTokenWithSecretKeyUrl": "${process.env.GET_TOKEN_WITH_SECRET_KEY_URL}",
    "deleteTaskUrl": "${process.env.DELETE_TASK_URL}",
    "deleteRoundUrl": "${process.env.DELETE_ROUND_URL}",
    "saveRoundUrl": "${process.env.SAVE_ROUND_URL}",
    "uploadProfileImageUrl": "${process.env.UPLOAD_PROFILE_IMAGE_URL}",
    "saveTaskUrl": "${process.env.SAVE_TASK_URL}",
    "setRoundsOrderUrl": "${process.env.SET_ROUNDS_ORDER_URL}"
  }`;
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
  dotenvPath: DOTENV_PATH, remoteConfigPath: './src/assets/remote-config-default.json'
}, {
  dotenvPath: DOTENV_PROD_PATH, remoteConfigPath: './src/assets/remote-config-default-prod.json'
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
