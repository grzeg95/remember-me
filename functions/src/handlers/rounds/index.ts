import {runWith} from 'firebase-functions';
import {regionId} from '../../config';

export const deleteTask = runWith({
  timeoutSeconds: 30,
  memory: '256MB',
  maxInstances: 2
}).region(regionId).https.onCall(require('./delete-task').handler);

export const saveTask = runWith({
  timeoutSeconds: 30,
  memory: '256MB',
  maxInstances: 2
}).region(regionId).https.onCall(require('./save-task').handler);

export const setTimesOfDayOrder = runWith({
  timeoutSeconds: 30,
  memory: '256MB',
  maxInstances: 2
}).region(regionId).https.onCall(require('./set-times-of-day-order').handler);

export const saveRound = runWith({
  timeoutSeconds: 30,
  memory: '256MB',
  maxInstances: 2
}).region(regionId).https.onCall(require('./save-round').handler);

export const deleteRound = runWith({
  timeoutSeconds: 30,
  memory: '256MB',
  maxInstances: 2
}).region(regionId).https.onCall(require('./delete-round').handler);

export const decryptAsymmetricByPrivateKey = runWith({
  timeoutSeconds: 30,
  memory: '256MB',
  maxInstances: 2
}).region(regionId).https.onCall(require('../../security/get-my-private-key').handler);

export const userOnCreate = runWith({
  timeoutSeconds: 30,
  memory: '256MB',
  maxInstances: 2
}).region(regionId).auth.user().onCreate(require('./user-on-create').handler);
