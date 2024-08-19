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
    "guestComponent": "${process.env.GUEST_COMPONENT}"
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
