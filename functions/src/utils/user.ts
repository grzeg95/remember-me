import {DocumentSnapshot, Firestore, Transaction} from 'firebase-admin/firestore';
import {HttpsError} from 'firebase-functions/v2/https';
import {User} from '../models/user';
import {TransactionWrite} from './transaction-write';

export const getUserDocSnap = async (firestore: Firestore, transaction: Transaction, uid: string): Promise<DocumentSnapshot<User>> => {

  const userRef = User.ref(firestore, uid);

  return transaction.get(userRef).then((userDocSnap) => {
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
