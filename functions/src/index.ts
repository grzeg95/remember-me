import {initializeApp} from 'firebase-admin';
import {runWith} from 'firebase-functions';

initializeApp();

export const deleteTask = runWith({
  timeoutSeconds: 10,
  memory: '256MB',
  maxInstances: 2
}).region('europe-west2').https.onCall(require('./handlers/delete-task').handler);

export const saveTask = runWith({
  timeoutSeconds: 10,
  memory: '256MB',
  maxInstances: 2
}).region('europe-west2').https.onCall(require('./handlers/save-task').handler);

export const setTimesOfDayOrder = runWith({
  timeoutSeconds: 10,
  memory: '256MB',
  maxInstances: 2
}).region('europe-west2').https.onCall(require('./handlers/set-times-of-day-order').handler);
