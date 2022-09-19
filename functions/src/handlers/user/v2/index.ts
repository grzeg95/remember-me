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

export const uploadprofileimage = onRequest(opts, (req: https.Request, resp: Response) =>
  handler(req, resp, require('../upload-profile-image').handler, {
    contentType: ['image/jpeg', 'image/jpg', 'image/png']
  })
);
