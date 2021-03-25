import {firestore} from 'firebase-admin';
import {HttpsError} from 'firebase-functions/lib/providers/https';
import Transaction = firestore.Transaction;
import DocumentSnapshot = firestore.DocumentSnapshot;
import Firestore = firestore.Firestore;

export const getUser = async (app: Firestore, transaction: Transaction, uid: string): Promise<DocumentSnapshot> => {

  const userDocSnap = await transaction.get(app.collection('users').doc(uid));
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
};
