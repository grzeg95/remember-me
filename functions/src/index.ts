import {initializeApp} from 'firebase-admin';
import {runWith} from 'firebase-functions';

initializeApp();

// up to 57 operations
export const deleteTask = runWith({
  timeoutSeconds: 10,
  memory: '128MB',
  maxInstances: 2
}).region('europe-west2').https.onCall(require('./handlers/deleteTask').handler);

// up to 62 operations
export const saveTask = runWith({
  timeoutSeconds: 10,
  memory: '128MB',
  maxInstances: 2
}).region('europe-west2').https.onCall(require('./handlers/saveTask').handler);

// up to 51 operations
export const setTodayOrder = runWith({
  timeoutSeconds: 10,
  memory: '128MB',
  maxInstances: 2
}).region('europe-west2').https.onCall(require('./handlers/setTodayOrder').handler);
