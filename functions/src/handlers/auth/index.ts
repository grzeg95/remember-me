import {RuntimeOptions, runWith} from 'firebase-functions';
import {regionId} from '../../config';

const https = runWith({
  timeoutSeconds: 60,
  memory: '1GB',
  maxInstances: 10
}).region(regionId).https;

export const getTokenWithSecretKey = https.onCall(require('./get-token-with-secret-key').handler);

const runtimeOptions: RuntimeOptions = {
  timeoutSeconds: 60,
  memory: '1GB',
  maxInstances: 10
};

const userBuilder = runWith(runtimeOptions).region(regionId).auth.user();

export const userOnCreate = userBuilder.onCreate(require('./user-on-create').handler);

export const userOnDelete = userBuilder.onDelete(require('./user-on-delete').handler);
