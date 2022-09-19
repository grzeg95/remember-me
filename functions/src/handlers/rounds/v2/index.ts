import {Response} from 'express';
import {https} from 'firebase-functions';
import {HttpsOptions, onRequest} from 'firebase-functions/v2/https';
import {regionIdForFunctionsV2} from '../../../config';
import {handler} from '../../../helpers/https-tools';

const opts: HttpsOptions = {
  timeoutSeconds: 60,
  memory: '1GiB',
  region: regionIdForFunctionsV2,
  maxInstances: 10,
  retry: true,
  ingressSettings: 'ALLOW_ALL',
  concurrency: 80,
  invoker: 'public'
};

export const deletetask = onRequest(opts, (req: https.Request, resp: Response) =>
  handler(req, resp, require('../delete-task').handler, {
    contentType: 'application/json'
  })
);

export const savetask = onRequest(opts, (req: https.Request, resp: Response) =>
  handler(req, resp, require('../save-task').handler, {
    contentType: 'application/json'
  })
);

export const settimesofdayorder = onRequest(opts, (req: https.Request, resp: Response) =>
  handler(req, resp, require('../set-times-of-day-order').handler, {
    contentType: 'application/json'
  })
);

export const saveround = onRequest(opts, (req: https.Request, resp: Response) =>
  handler(req, resp, require('../save-round').handler, {
    contentType: 'application/json'
  })
);

export const deleteround = onRequest(opts, (req: https.Request, resp: Response) =>
  handler(req, resp, require('../delete-round').handler, {
    contentType: 'text/plain'
  })
);

export const setroundsorder = onRequest(opts, (req: https.Request, resp: Response) =>
  handler(req, resp, require('../set-rounds-order').handler, {
    contentType: 'application/json'
  })
);
