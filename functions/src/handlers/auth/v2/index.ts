import {Response} from 'express';
import {https} from 'firebase-functions';
import {onRequest} from 'firebase-functions/v2/https';
import {optsV2} from '../../../config';
import {handler} from '../../../tools';

export const gettokenwithsecretkey = onRequest(optsV2, (req: https.Request, resp: Response) =>
  handler(req, resp, require('../get-token-with-secret-key').handler, {
    contentType: 'text/plain'
  })
);
