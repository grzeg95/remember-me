import {onCall, HttpsOptions} from 'firebase-functions/v2/https';

const opts: HttpsOptions = {
  timeoutSeconds: 30,
  memory: '512MiB',
  region: 'europe-west4',
  maxInstances: 10,
  retry: true,
  ingressSettings: 'ALLOW_ALL',
  concurrency: 80,
  invoker: 'public'
};

export const deletetask = onCall(opts, require('./delete-task').handler);

export const savetask = onCall(opts, require('./save-task').handler);

export const settimesofdayorder = onCall(opts, require('./set-times-of-day-order').handler);

export const saveround = onCall(opts, require('./save-round').handler);

export const deleteround = onCall(opts, require('./delete-round').handler);

export const setroundsorder = onCall(opts, require('./set-rounds-order').handler);
