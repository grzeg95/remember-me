import {firestore} from 'firebase-admin';
import {HttpsError} from 'firebase-functions/lib/providers/https';
import Transaction = firestore.Transaction;
import DocumentSnapshot = firestore.DocumentSnapshot;
import {TimeOfDay} from './models';

export const getTimeOfDayFromSnap = (docSnap: DocumentSnapshot): TimeOfDay => {
  return {
    status: 'updated',
    ref: docSnap.ref,
    exists: docSnap.exists,
    data: {
      counter: docSnap.data()?.counter || 1,
      prev: docSnap.data()?.prev || null,
      next: docSnap.data()?.next || null,
    }
  } as TimeOfDay;
}

export const getTimeOfDay = async (transaction: Transaction, userDocSnap: DocumentSnapshot, timeOfDayId: string, mustExists?: boolean): Promise<TimeOfDay> => {

  return transaction.get(
    userDocSnap.ref.collection('timesOfDay').doc(timeOfDayId)
  ).then((docSnap) => {
    if (mustExists && !docSnap.exists) {
      throw new HttpsError(
        'invalid-argument',
        'Bad Request',
        'This should works 🙄'
      );
    }
    return getTimeOfDayFromSnap(docSnap);
  });

};
