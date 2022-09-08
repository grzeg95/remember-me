import {KeyManagementServiceClient} from '@google-cloud/kms';
const dotenv = require('dotenv');
const path = require('path');

const DOTENV_PATH = path.join(__dirname, process.env.FUNCTIONS_EMULATOR ? '.env' : '.env.prod');
dotenv.config({path: DOTENV_PATH, override: true});

export const authorizedDomains = new Set(JSON.parse(process.env.PROJECT_FIREBASE_AUTHORIZED_DOMAINS as string));
export const keyManagementServiceClient = new KeyManagementServiceClient();
export const regionId = process.env.PROJECT_FIREBASE_REGION_ID as string;
export const regionIdForFunctionsV2 = process.env.PROJECT_FIREBASE_REGION_ID_FOR_FUNCTIONS_V2 as string;

export const cryptoKeyVersionPath = keyManagementServiceClient.cryptoKeyVersionPath(
  process.env.CRYPTO_KEY_VERSION_PATH_PROJECT as string,
  regionId,
  process.env.CRYPTO_KEY_VERSION_PATH_KEY_RING as string,
  process.env.CRYPTO_KEY_VERSION_PATH_KEY_CRYPTO_KEY as string,
  process.env.CRYPTO_KEY_VERSION_PATH_KEY_CRYPTO_KEY_VERSION as string
);
