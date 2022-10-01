import {onRequest} from 'firebase-functions/v2/https';
import {optsV2} from '../../../config';
import {handler} from '../../../tools';

export const uploadprofileimage = onRequest(optsV2, (req, resp) =>
  handler(req, resp, require('../upload-profile-image').handler,['image/jpeg', 'image/jpg', 'image/png'])
);
