import {firestore} from 'firebase-admin';
import {HttpsError} from 'firebase-functions/v2/https';
import {TransactionWrite} from './transaction-write';
import DocumentSnapshot = firestore.DocumentSnapshot;
import Firestore = firestore.Firestore;
import Transaction = firestore.Transaction;

export const getUserDocSnap = async (app: Firestore, transaction: Transaction, uid: string): Promise<DocumentSnapshot> => {

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

export const writeUser = (transactionWrite: TransactionWrite, userDocSnap: DocumentSnapshot, userDataToWrite: any): void => {
  if (userDocSnap.exists) {
    transactionWrite.update(userDocSnap.ref, userDataToWrite);
  } else {
    transactionWrite.create(userDocSnap.ref, userDataToWrite);
  }
};
