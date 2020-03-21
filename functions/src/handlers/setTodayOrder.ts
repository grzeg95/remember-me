import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';
import {db} from '../index';
import DocumentData = FirebaseFirestore.DocumentData;
import DocumentSnapshot = FirebaseFirestore.DocumentSnapshot;

/**
 * 1 + MAX[20] reads
 * MAX[20] writes
 * Read all user data about task and remove it
 * @param data {taskId: any}
 * @param context functions.https.CallableContext
 * @return Promise<T>
 **/
export const handler = (data: any[], context: functions.https.CallableContext) => {

  const auth: {
    uid: string;
    token: firebase.auth.DecodedIdToken;
  } | undefined = context.auth;

  if (
    !data ||
    !Array.isArray(data) ||
    data.some((timeOfDay) => typeof timeOfDay !== 'string' || timeOfDay.length > 20 || timeOfDay.length === 0) ||
    (new Set(data).size !== data.length) ||
    data.length > 20
  ) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Bad Request',
      'Check function requirements'
    );
  }

  return db.runTransaction((transaction) =>
    transaction.get(db.collection('users').doc(auth?.uid as string)).then(async (userDocSnap) => {

      // interrupt if user is not in my firestore
      if (!userDocSnap.exists) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Register to use this functionality',
          `User ${auth?.uid} does not exist`
        );
      }

      /*
      * Read all data
      * */

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

      data.forEach((timeOfDay: string, index) => {

        const timesOfDayDocSnap = timesOfDayDocSnaps.find((timesOfDayDocSnapNext) => timesOfDayDocSnapNext.data()?.name === timeOfDay);

        if (!timesOfDayDocSnap) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            'Bad Request',
            'Check function requirements'
          );
        }

        transaction.update(timesOfDayDocSnap.ref, {
          position: index
        });

      });

    }));

};
