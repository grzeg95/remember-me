const path = require('path');
const fs = require('fs');

let envName;

if (process.env.CREATE_FUNCTIONS_EMULATOR === '1') {
  envName = '.env';
}

if (process.env.CREATE_FUNCTIONS_EMULATOR === '0') {
  envName = '.env.prod';
}

const DOTENV_PATH_TO_COPY = path.join(__dirname, envName);
const DOTENV_PATH_TO_PASTE = path.join(__dirname, 'lib', 'functions', 'src', envName);

fs.copyFileSync(DOTENV_PATH_TO_COPY, DOTENV_PATH_TO_PASTE);
