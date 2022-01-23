import {KeyManagementServiceClient} from '@google-cloud/kms';

export const projectId = 'remember-me-dev';
export const regionId = 'europe-west2';
export const keyManagementServiceClient = new KeyManagementServiceClient();

export const cryptoKeyVersionPath = keyManagementServiceClient.cryptoKeyVersionPath(
  // @ts-ignore
  projectId,
  regionId,
  'remember-me-dev-key-ring',
  'asymmetric',
  '1'
);
