import * as functions from 'firebase-functions';
import {db} from '../index';

export const handler = (data: any, context: functions.https.CallableContext) => {

  const auth = context.auth;

  // interrupt if data.taskId is not correct or !auth
  if (!data.taskId || typeof data.taskId !== 'string' || !auth) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Bad Request',
      'Check function requirements'
    );
  }

  const taskId = data.taskId;

  return db.runTransaction((transaction) =>

    // get user from firestore
    transaction.get(db.collection('users').doc(auth.uid)).then((userSnap) => {

      // interrupt if user is not in my firestore
      if (!userSnap.exists) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Bad Request',
          'Check function requirements'
        );
      }

      return Promise.all([
        transaction.get(userSnap.ref.collection('task').doc(taskId)),
        transaction.get(userSnap.ref.collection('today').doc('mon').collection('task').doc(taskId)),
        transaction.get(userSnap.ref.collection('today').doc('tue').collection('task').doc(taskId)),
        transaction.get(userSnap.ref.collection('today').doc('wed').collection('task').doc(taskId)),
        transaction.get(userSnap.ref.collection('today').doc('thu').collection('task').doc(taskId)),
        transaction.get(userSnap.ref.collection('today').doc('fri').collection('task').doc(taskId)),
        transaction.get(userSnap.ref.collection('today').doc('sat').collection('task').doc(taskId)),
        transaction.get(userSnap.ref.collection('today').doc('sun').collection('task').doc(taskId)),
      ]).then((docsSnaps) => {
        docsSnaps.forEach((docSnap) =>
          transaction.delete(docSnap.ref)
        );
        return transaction;
      });

    })
  ).then(() => {
    return {
      message: 'Your task has been deleted'
    };
  }).catch((e) => {
    throw new functions.https.HttpsError(
      'internal',
      e,
      'Your task has not been deleted'
    );
  });

};
