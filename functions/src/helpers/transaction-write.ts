import {firestore} from 'firebase-admin';

interface TransactionWriteListItem {
  docRef: firestore.DocumentReference,
  data?: Object | Promise<Object>
}

export class TransactionWrite {

  setList: TransactionWriteListItem[] = [];
  createList: TransactionWriteListItem[] = [];
  updateList: TransactionWriteListItem[] = [];
  deleteList: TransactionWriteListItem[] = [];

  constructor(private transaction: firestore.Transaction) {
  }

  set(docRef: firestore.DocumentReference, data: Object | Promise<Object>) {
    this.setList.push({
      docRef,
      data
    });
  }

  create(docRef: firestore.DocumentReference, data: Object | Promise<Object>) {
    this.createList.push({
      docRef,
      data
    });
  }

  update(docRef: firestore.DocumentReference, data: Object | Promise<Object>) {
    this.updateList.push({
      docRef,
      data
    });
  }

  delete(docRef: firestore.DocumentReference) {
    this.deleteList.push({
      docRef
    });
  }

  async execute(): Promise<firestore.Transaction> {

    const setDataPromise = [];
    const createDataPromise = [];
    const updateDataPromise = [];

    for (const item of this.setList) {
      setDataPromise.push(item.data);
    }

    for (const item of this.createList) {
      createDataPromise.push(item.data);
    }

    for (const item of this.updateList) {
      updateDataPromise.push(item.data);
    }

    return Promise.all([
      Promise.all(setDataPromise),
      Promise.all(createDataPromise),
      Promise.all(updateDataPromise) as Promise<{}[]>
    ]).then(([setData, createData, updateData]) => {

      for (const [i, item] of this.setList.entries()) {
        const data = setData[i];
        if (data !== undefined) {
          this.transaction.set(item.docRef, data);
        } else {
          throw new Error('data for set is undefined');
        }
      }

      for (const [i, item] of this.createList.entries()) {
        const data = createData[i];
        if (data !== undefined) {
          this.transaction.create(item.docRef, data);
        } else {
          throw new Error('data for create is undefined');
        }
      }

      for (const [i, item] of this.updateList.entries()) {
        const data = updateData[i];
        if (data !== undefined) {
          this.transaction.update(item.docRef, data);
        } else {
          throw new Error('data for update is undefined');
        }
      }

      for (const item of this.deleteList) {
        this.transaction.delete(item.docRef);
      }

      this.deleteList = [];
      this.setList = [];
      this.updateList = [];
      this.createList = [];

      return this.transaction;
    });
  }
}
