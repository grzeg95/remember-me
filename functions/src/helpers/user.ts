import {firestore} from 'firebase-admin';
import {HttpsError} from 'firebase-functions/lib/providers/https';
import Transaction = firestore.Transaction;
import DocumentSnapshot = firestore.DocumentSnapshot;
import Firestore = firestore.Firestore;

export const getUser = async (app: Firestore, transaction: Transaction, uid: string): Promise<DocumentSnapshot> => {

  return transaction.get(app.collection('users').doc(uid)).then((userDocSnap) => {
    const userData = userDocSnap.data();
    const isDisabled = userData?.hasOwnProperty('disabled') ? userData.disabled : false;

    if (isDisabled) {
      throw new HttpsError(
        'permission-denied',
        'This account is disabled',
        'Contact administrator to resolve this problem'
      );
    }

    return userDocSnap;
  });
};

export const writeUser = (transaction: Transaction, userDocSnap: DocumentSnapshot, userDataToWrite: any): void => {
  if (userDocSnap.exists) {
    transaction.update(userDocSnap.ref, userDataToWrite);
  } else {
    transaction.create(userDocSnap.ref, userDataToWrite);
  }
};
