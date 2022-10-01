import {https} from '../../config';
import {handler} from '../../tools';

export const uploadProfileImage = https.onRequest((req, resp) =>
  handler(req, resp, require('./upload-profile-image').handler,['image/jpeg', 'image/jpg', 'image/png'])
);
