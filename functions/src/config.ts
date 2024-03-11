import {KeyManagementServiceClient} from '@google-cloud/kms';
import {runWith} from 'firebase-functions';
import {HttpsOptions} from 'firebase-functions/v2/https';
import {BlockingOptions} from 'firebase-functions/v2/identity';

import dotenv = require('dotenv');
import path = require('path');

const DOTENV_PATH = path.join(__dirname, (process.env.FUNCTIONS_EMULATOR || process.env.FOR_FIREBASE_EMULATOR === '1') ? '.env.functions' : '.env.functions.prod');
dotenv.config({path: DOTENV_PATH, override: true});

export const keyManagementServiceClient = new KeyManagementServiceClient();
export const regionId = process.env.PROJECT_FIREBASE_REGION_ID as string;
export const regionIdForFunctionsV2 = process.env.PROJECT_FIREBASE_REGION_ID_FOR_FUNCTIONS_V2 as string;

export const cryptoKeyVersionPath = keyManagementServiceClient.cryptoKeyVersionPath(
  process.env.CRYPTO_KEY_VERSION_PATH_PROJECT as string,
  process.env.CRYPTO_KEY_VERSION_PATH_KEY_LOCATION as string,
  process.env.CRYPTO_KEY_VERSION_PATH_KEY_RING as string,
  process.env.CRYPTO_KEY_VERSION_PATH_KEY_CRYPTO_KEY as string,
  process.env.CRYPTO_KEY_VERSION_PATH_KEY_CRYPTO_KEY_VERSION as string
);

export const fnBuilder = runWith({
  timeoutSeconds: 60,
  memory: '1GB',
  maxInstances: 10,
  failurePolicy: true
}).region(regionId);

export const https = fnBuilder.https;

export const optsV2: HttpsOptions = {
  timeoutSeconds: 60,
  memory: '1GiB',
  region: regionIdForFunctionsV2,
  maxInstances: 10,
  ingressSettings: 'ALLOW_ALL',
  concurrency: 250,
  invoker: 'public'
};

export const blockingOptions: BlockingOptions = {
  timeoutSeconds: 60,
  memory: '1GiB',
  region: regionIdForFunctionsV2,
  maxInstances: 10,
  ingressSettings: 'ALLOW_ALL',
  concurrency: 250
};
