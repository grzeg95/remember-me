import {KeyManagementServiceClient} from '@google-cloud/kms';
import {runWith} from 'firebase-functions';
import {HttpsOptions} from 'firebase-functions/lib/v2/providers/https';

const dotenv = require('dotenv');
const path = require('path');

const DOTENV_PATH = path.join(__dirname, (process.env.FUNCTIONS_EMULATOR || process.env.FOR_FIREBASE_EMULATOR === '1') ? '.env.functions' : '.env.functions.prod');
dotenv.config({path: DOTENV_PATH, override: true});

export const authorizedDomains = JSON.parse(process.env.PROJECT_FIREBASE_AUTHORIZED_DOMAINS as string) as string[];
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

export const fnBuilder = runWith({
  timeoutSeconds: 60,
  memory: '1GB',
  maxInstances: 10
}).region(regionId);

export const httpsFn = fnBuilder.https;

export const optsV2: HttpsOptions = {
  timeoutSeconds: 60,
  memory: '1GiB',
  region: regionIdForFunctionsV2,
  maxInstances: 10,
  retry: true,
  ingressSettings: 'ALLOW_ALL',
  concurrency: 80,
  invoker: 'public'
};
