import {runWith} from 'firebase-functions';
import {regionId} from '../../config';

const https = runWith({
  timeoutSeconds: 60,
  memory: '1GB',
  maxInstances: 10
}).region(regionId).https;

export const uploadProfileImage = https.onRequest(require('./upload-profile-image').handler);
