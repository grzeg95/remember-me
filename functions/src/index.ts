import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';
import {handler as deleteTaskHandler} from './handlers/deleteTask';
import {handler as saveTaskHandler} from './handlers/saveTask';
import {handler as setProgressHandler} from './handlers/setProgress';
import {handler as setTodayOrderHandler} from './handlers/setTodayOrder';

export const app = firebase.initializeApp().firestore();

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
  memory: "256MB"
}).region('europe-west2').https.onCall(setProgressHandler);

// up to 51 operations
export const setTodayOrder = functions.runWith({
  timeoutSeconds: 5,
  memory: "256MB"
}).region('europe-west2').https.onCall(setTodayOrderHandler);
