import {HttpsOptions, onRequest} from 'firebase-functions/v2/https';
import {regionIdForFunctionsV2} from '../../../config';

const opts: HttpsOptions = {
  timeoutSeconds: 30,
  memory: '1GiB',
  region: regionIdForFunctionsV2,
  maxInstances: 10,
  retry: true,
  ingressSettings: 'ALLOW_ALL',
  concurrency: 80,
  invoker: 'public',
  cors: true
};

export const uploadprofileimage = onRequest(opts, require('../upload-profile-image').handler);
