import {Response} from 'express';
import {https} from 'firebase-functions';
import {onRequest} from 'firebase-functions/v2/https';
import {optsV2} from '../../../config';
import {handler} from '../../../tools';

export const deletetask = onRequest(optsV2, (req: https.Request, resp: Response) =>
  handler(req, resp, require('../delete-task').handler, {
    contentType: 'application/json'
  })
);

export const savetask = onRequest(optsV2, (req: https.Request, resp: Response) =>
  handler(req, resp, require('../save-task').handler, {
    contentType: 'application/json'
  })
);

export const settimesofdayorder = onRequest(optsV2, (req: https.Request, resp: Response) =>
  handler(req, resp, require('../set-times-of-day-order').handler, {
    contentType: 'application/json'
  })
);

export const saveround = onRequest(optsV2, (req: https.Request, resp: Response) =>
  handler(req, resp, require('../save-round').handler, {
    contentType: 'application/json'
  })
);

export const deleteround = onRequest(optsV2, (req: https.Request, resp: Response) =>
  handler(req, resp, require('../delete-round').handler, {
    contentType: 'text/plain'
  })
);

export const setroundsorder = onRequest(optsV2, (req: https.Request, resp: Response) =>
  handler(req, resp, require('../set-rounds-order').handler, {
    contentType: 'application/json'
  })
);
