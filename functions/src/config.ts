import {KeyManagementServiceClient} from '@google-cloud/kms';

export const keyManagementServiceClient = new KeyManagementServiceClient();

let _regionId;
let _cryptoKeyVersionPath;

if (process.env.FUNCTIONS_EMULATOR) {
  _regionId = 'europe-west2';
  _cryptoKeyVersionPath = keyManagementServiceClient.cryptoKeyVersionPath(
    // @ts-ignore
    'remember-me-dev',
    _regionId,
    'remember-me-dev-key-ring',
    'asymmetric',
    '1'
  );
} else {
  _regionId = 'europe-central2';
  _cryptoKeyVersionPath = keyManagementServiceClient.cryptoKeyVersionPath(
    // @ts-ignore
    'remember-me-4-keys',
    _regionId,
    'remember-me-4-keys-key-ring',
    'remember-me-4-keys-firebase-asymmetric',
    '1'
  );
}

export const regionId = _regionId;
export const cryptoKeyVersionPath = _cryptoKeyVersionPath;
