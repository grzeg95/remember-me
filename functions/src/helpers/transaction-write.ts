import {firestore} from 'firebase-admin';

export interface TransactionWriteListItem {
  transaction: firestore.Transaction,
  docRef: firestore.DocumentReference,
  type: 'set' | 'create' | 'update' | 'delete',
  operation: any
}

export interface TransactionWriteList {
  value: TransactionWriteListItem[];
}

export const transactionWriteAdd = (
  transaction: firestore.Transaction,
  transactionWriteList: TransactionWriteList,
  docRef: firestore.DocumentReference,
  type: 'set' | 'create' | 'update' | 'delete',
  operation?: any
) => {
  transactionWriteList.value.push({
    transaction,
    docRef,
    type,
    operation
  });
};

export const transactionWriteExecute = async (transactionWriteList: TransactionWriteList) => {

  while (transactionWriteList.value.length) {

    const transactionWriteOperation = transactionWriteList.value.pop();

    if (transactionWriteOperation) {
      let writeOperation = transactionWriteOperation.operation;
      if (writeOperation) {

        if (writeOperation.constructor.name === 'Promise') {
          writeOperation = await transactionWriteOperation.operation;
        }

        // @ts-ignore
        transactionWriteOperation.transaction[transactionWriteOperation.type](transactionWriteOperation.docRef, writeOperation);
      } else {

        // @ts-ignore
        transactionWriteOperation.transaction[transactionWriteOperation.type](transactionWriteOperation.docRef);
      }
    }
  }
};
