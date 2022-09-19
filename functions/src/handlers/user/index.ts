import {runWith, https} from 'firebase-functions';
import {Response} from 'express';
import {regionId} from '../../config';
import {handler} from '../../helpers/https-tools';

const httpsFn = runWith({
  timeoutSeconds: 60,
  memory: '1GB',
  maxInstances: 10
}).region(regionId).https;

export const uploadProfileImage = httpsFn.onRequest((req: https.Request, resp: Response) =>
  handler(req, resp, require('./upload-profile-image').handler, {
    contentType: ['image/jpeg', 'image/jpg', 'image/png']
  })
);
