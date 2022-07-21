import {KeyManagementServiceClient} from '@google-cloud/kms';

export const keyManagementServiceClient = new KeyManagementServiceClient();

// DEV
export const regionId = 'europe-west2';
export const projectId = 'remember-me-dev';
export const cryptoKeyVersionPath = keyManagementServiceClient.cryptoKeyVersionPath(
  // @ts-ignore
  projectId,
  regionId,
  'remember-me-dev-key-ring',
  'asymmetric',
  '1'
);

// PROD
// export const regionId = 'europe-central2';
// export const cryptoKeyVersionPath = keyManagementServiceClient.cryptoKeyVersionPath(
//   // @ts-ignore
//   'remember-me-4-keys',
//   'europe-central2',
//   'remember-me-4-keys-key-ring',
//   'remember-me-4-keys-firebase-asymmetric',
//   '1'
// );
