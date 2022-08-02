import {runWith} from 'firebase-functions';
import {regionId} from '../config';

export const getTokenWithSecretKey = runWith({
  timeoutSeconds: 60,
  memory: '512MB',
  maxInstances: 2
}).region(regionId).https.onCall(require('./get-token-with-secret-key').handler);

export const userOnCreate = runWith({
  timeoutSeconds: 60,
  memory: '1GB',
  maxInstances: 2
}).region(regionId).auth.user().onCreate(require('./user-on-create').handler);

export const userOnDelete = runWith({
  timeoutSeconds: 60,
  memory: '512MB',
  maxInstances: 2
}).region(regionId).auth.user().onDelete(require('./user-on-delete').handler);
