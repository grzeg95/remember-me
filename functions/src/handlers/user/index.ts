import {Response} from 'express';
import {https} from 'firebase-functions';
import {httpsFn} from '../../config';
import {handler} from '../../tools';

export const uploadProfileImage = httpsFn.onRequest((req: https.Request, resp: Response) =>
  handler(req, resp, require('./upload-profile-image').handler, {
    contentType: ['image/jpeg', 'image/jpg', 'image/png']
  })
);
