import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';
import {db} from '../index';

/**
 * 9 reads, 7 deletes
 * Read all user data about task and remove it
 * @param data {taskId: any}
 * @param context functions.https.CallableContext
 * @return Promise<T>
**/
export const handler = (data: {taskId: any}, context: functions.https.CallableContext) => {

  const auth: {
    uid: string;
    token: firebase.auth.DecodedIdToken;
  } | undefined = context.auth;

  // interrupt if data.taskId is not correct or !auth
  if (!data.taskId || typeof data.taskId !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Bad Request',
      'Check function requirements'
    );
  }

  return db.runTransaction((transaction) =>

    // get user from firestore
    transaction.get(db.collection('users').doc(auth?.uid as string)).then((userDocSnap) => {

      // interrupt if user is not in my firestore
      if (!userDocSnap.exists) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Register to use this functionality',
          `User ${auth?.uid} does not exist`
        );
      }

      return transaction.get(userDocSnap.ref.collection('task').doc(data.taskId)).then((taskDocSnap) => {

        // interrupt if user has not this task
        if (!taskDocSnap.exists) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            'Task does not exist',
            `User ${userDocSnap.data()?.id} has not task ${data.taskId}`
          );
        }

        const reads: Promise<FirebaseFirestore.DocumentSnapshot>[] = [];

        (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']).forEach((day) =>
          reads.push(transaction.get(userDocSnap.ref.collection('today').doc(`${day}/task/${data.taskId}`)))
        );

        return Promise.all(reads).then((docsSnaps) => {
          docsSnaps.forEach((docSnap) =>
            transaction.delete(docSnap.ref)
          );
          transaction.delete(taskDocSnap.ref);

          const taskDocSnapData = taskDocSnap.data();
          let currentTimesOfDayKeys: string[] = [];

          if (taskDocSnapData && taskDocSnapData['timesOfDay']) {
            currentTimesOfDayKeys = Object.keys(taskDocSnapData['timesOfDay']);
          }

          const userDocSnapData = userDocSnap.data();
          let userTimesOfDay: {
            [name: string]: {
              position: number,
              counter: number
            }
          } = {};

          if (userDocSnapData && userDocSnapData['timesOfDay']) {
            userTimesOfDay = userDocSnapData['timesOfDay'];
          }

          currentTimesOfDayKeys.forEach((i) => {
            if (userTimesOfDay[i]) {
              userTimesOfDay[i].counter--;
              if (userTimesOfDay[i].counter <= 0) {
                delete userTimesOfDay[i];
              }
            }
          });

          return transaction.update(userDocSnap.ref, {
            timesOfDay: userTimesOfDay
          });

        });
      });

    })
  ).then(() => ({
    message: 'Your task has been deleted'
  })).catch((e) => {
    throw new functions.https.HttpsError(
      'internal',
      e,
      'Your task has not been deleted'
    );
  });

};
