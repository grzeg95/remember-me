import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as handlers from './handlers/index';

const runtimeOptions: functions.RuntimeOptions = {
  timeoutSeconds: 5,
  memory: "128MB"
};

admin.initializeApp({
  credential: admin.credential.cert('./remember-me-3-admin-meta.json')
});

export const db = admin.firestore();

export const deleteTask = functions.runWith(runtimeOptions).region('europe-west2').https.onCall(handlers.deleteTask);

export const saveTask = functions.runWith(runtimeOptions).region('europe-west2').https.onCall(handlers.saveTask);

export const setProgress = functions.runWith(runtimeOptions).region('europe-west2').https.onCall(handlers.setProgress);
