import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {deleteTaskHandler, saveTaskHandler, setProgressHandler, setTodayOrderHandler} from './handlers';

admin.initializeApp();

export const db = admin.firestore();

// up to 57 operations
export const deleteTask = functions.runWith({
  timeoutSeconds: 5,
  memory: "256MB"
}).region('europe-west2').https.onCall(deleteTaskHandler);

// up to 62 operations
export const saveTask = functions.runWith({
  timeoutSeconds: 5,
  memory: "256MB"
}).region('europe-west2').https.onCall(saveTaskHandler);

// 4 operations
export const setProgress = functions.runWith({
  timeoutSeconds: 5,
  memory: "128MB"
}).region('europe-west2').https.onCall(setProgressHandler);

// up to 51 operations
export const setTodayOrder = functions.runWith({
  timeoutSeconds: 5,
  memory: "256MB"
}).region('europe-west2').https.onCall(setTodayOrderHandler);
