import {Response} from 'express';
import {https} from 'firebase-functions';
import {onRequest} from 'firebase-functions/v2/https';
import {optsV2} from '../../../config';
import {handler} from '../../../tools';

export const uploadprofileimage = onRequest(optsV2, (req: https.Request, resp: Response) =>
  handler(req, resp, require('../upload-profile-image').handler, {
    contentType: ['image/jpeg', 'image/jpg', 'image/png']
  })
);
