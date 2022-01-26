import {runWith} from 'firebase-functions';
import {regionId} from '../config';

export const getMyPrivateKey = runWith({
  timeoutSeconds: 30,
  memory: '512MB',
  maxInstances: 2
}).region(regionId).https.onCall(require('./get-my-private-key').handler);

export const userOnCreate = runWith({
  timeoutSeconds: 30,
  memory: '1GB',
  maxInstances: 2
}).region(regionId).auth.user().onCreate(require('./user-on-create').handler);
