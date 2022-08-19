import {onCall, HttpsOptions} from 'firebase-functions/v2/https';

const opts: HttpsOptions = {
  timeoutSeconds: 60,
  memory: '1GiB',
  region: 'europe-west4',
  maxInstances: 10,
  retry: true,
  ingressSettings: 'ALLOW_ALL',
  concurrency: 80,
  invoker: 'public'
};

export const gettokenwithsecretkey = onCall(opts, require('./get-token-with-secret-key').handler);
