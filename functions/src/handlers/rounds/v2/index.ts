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

export const deletetask = onCall(opts, (request) => require('../delete-task').handler(request.data, request));

export const savetask = onCall(opts, (request) => require('../save-task').handler(request.data, request));

export const settimesofdayorder = onCall(opts, (request) => require('../set-times-of-day-order').handler(request.data, request));

export const saveround = onCall(opts, (request) => require('../save-round').handler(request.data, request));

export const deleteround = onCall(opts, (request) => require('../delete-round').handler(request.data, request));

export const setroundsorder = onCall(opts, (request) => require('../set-rounds-order').handler(request.data, request));
