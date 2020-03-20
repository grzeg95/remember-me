import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {deleteTaskHandler, saveTaskHandler, setProgressHandler, setTodayOrderHandler} from './handlers';

admin.initializeApp({
  credential: admin.credential.cert('./remember-me-3-admin-meta.json')
});

export const db = admin.firestore();


export const deleteTask = functions.runWith({
  timeoutSeconds: 5,
  memory: "256MB"
}).region('europe-west2').https.onCall(deleteTaskHandler);


export const saveTask = functions.runWith({
  timeoutSeconds: 5,
  memory: "256MB"
}).region('europe-west2').https.onCall(saveTaskHandler);


export const setProgress = functions.runWith({
  timeoutSeconds: 5,
  memory: "128MB"
}).region('europe-west2').https.onCall(setProgressHandler);


export const setTodayOrder = functions.runWith({
  timeoutSeconds: 5,
  memory: "128MB"
}).region('europe-west2').https.onCall(setTodayOrderHandler);
