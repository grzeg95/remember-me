import {initializeApp} from 'firebase-admin';
import {runWith} from 'firebase-functions';
import {handler as deleteTaskHandler} from './handlers/deleteTask';
import {handler as saveTaskHandler} from './handlers/saveTask';
import {handler as setTodayOrderHandler} from './handlers/setTodayOrder';

export const app = initializeApp().firestore();

// up to 57 operations
export const deleteTask = runWith({
  timeoutSeconds: 5,
  memory: '256MB',
  maxInstances: 2
}).region('europe-west2').https.onCall(deleteTaskHandler);

// up to 62 operations
export const saveTask = runWith({
  timeoutSeconds: 5,
  memory: '256MB',
  maxInstances: 2
}).region('europe-west2').https.onCall(saveTaskHandler);

// up to 51 operations
export const setTodayOrder = runWith({
  timeoutSeconds: 5,
  memory: '256MB',
  maxInstances: 2
}).region('europe-west2').https.onCall(setTodayOrderHandler);
