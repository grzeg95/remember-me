const path = require('path');
const fs = require('fs');

let envName = '.env.prod';

if (process.argv[2] === 'for-emulator') {
  envName = '.env';
}

const DOTENV_PATH_TO_COPY = path.join(__dirname, envName);
const DOTENV_PATH_TO_PASTE = path.join(__dirname, 'lib', 'functions', 'src', envName);

fs.copyFileSync(DOTENV_PATH_TO_COPY, DOTENV_PATH_TO_PASTE);
