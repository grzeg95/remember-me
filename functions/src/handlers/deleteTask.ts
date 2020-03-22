import {app} from '../index';
import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';
import DocumentSnapshot = FirebaseFirestore.DocumentSnapshot;
import DocumentData = FirebaseFirestore.DocumentData;

/**
 * 9 + MAX[20] reads
 * 8 deletes + (MAX[20] deletes and updates)
 * Read all user data about task and remove it
 * @param data {taskId: any}
 * @param context functions.https.CallableContext
 * @return Promise<T>
**/
export const handler = (data: {taskId: any}, context: functions.https.CallableContext): Promise<any> => {

  const auth: {
    uid: string;
    token: firebase.auth.DecodedIdToken;
  } | undefined = context.auth;

  // interrupt if data.taskId is not correct or !auth
  if (!data.taskId || typeof data.taskId !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Bad Request',
      'Some went wrong 🤫 Try again 🙂'
    );
  }

  return app.runTransaction((transaction) =>

    // get user from firestore
    transaction.get(app.collection('users').doc(auth?.uid as string)).then(async (userDocSnap) => {

      // interrupt if user is not in my firestore
      if (!userDocSnap.exists) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Register to use this functionality',
          `You dont't exist 😱`
        );
      }

      return transaction.get(userDocSnap.ref.collection('task').doc(data.taskId)).then(async (taskDocSnap) => {

        // interrupt if user has not this task
        if (!taskDocSnap.exists) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            'Task does not exist',
            `Some went wrong 🤫 Try again 🙂`
          );
        }

        /*
        * Read all data
        * */

        // read all task for user/{userId}/today/{day}/task/{taskId}
        const todayTasksPromise: Promise<DocumentSnapshot>[] = [];
        (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']).forEach((day) =>
          todayTasksPromise.push(transaction.get(userDocSnap.ref.collection('today').doc(`${day}/task/${data.taskId}`)))
        );
        const todayTasks: DocumentSnapshot[] = await Promise.all(todayTasksPromise);

        // read all times of day
        const timesOfDayDocSnaps = await userDocSnap.ref.collection('timesOfDay').listDocuments().then(async (docsRef) => {
          const timesOfDayDocSnapsPromise: Promise<DocumentSnapshot<DocumentData>>[] = [];
          docsRef.forEach((docRef) => {
            timesOfDayDocSnapsPromise.push(transaction.get(docRef).then((docSnap) => docSnap));
          });
          return await Promise.all(timesOfDayDocSnapsPromise);
        });

        /*
        * Proceed all data
        * */

        // proceed timesOfDayDocSnaps
        Object.keys(taskDocSnap.data()?.timesOfDay).forEach((timeOfDay) => {
          const inTheTimesOfDayDocSnaps = timesOfDayDocSnaps.find((timeOfDayDocSnap) => timeOfDayDocSnap.data()?.name === timeOfDay);
          if (inTheTimesOfDayDocSnaps) {
            const counter = inTheTimesOfDayDocSnaps.data()?.counter;
            if (counter - 1 === 0) {
              transaction.delete(inTheTimesOfDayDocSnaps.ref);
            } else {
              transaction.update(inTheTimesOfDayDocSnaps.ref, {
                counter: counter - 1
              });
            }
          }
        });

        // remove task
        transaction.delete(taskDocSnap.ref);

        // remove todayTasks
        todayTasks.forEach((docSnap) =>
          transaction.delete(docSnap.ref)
        );

        return transaction;
      });

    })
  ).then(() => ({
    details: 'Your task has been deleted 🤭'
  })).catch((error: functions.https.HttpsError) => {
    throw new functions.https.HttpsError(
      'internal',
      error.message,
      error.details && typeof error.details === 'string' ? error.details : 'Some went wrong 🤫 Try again 🙂'
    );
  });

};
