import {DocumentReference, Transaction} from 'firebase-admin/firestore';

interface TransactionWriteListItem {
  docRef: DocumentReference,
  data?: NonNullable<unknown> | Promise<NonNullable<unknown>>
}

/**
 * @class TransactionWrite
 */
export class TransactionWrite {

  setList: TransactionWriteListItem[] = [];
  createList: TransactionWriteListItem[] = [];
  updateList: TransactionWriteListItem[] = [];
  deleteList: TransactionWriteListItem[] = [];

  /**
   * Create TransactionWrite for specific Transaction
   * */
  constructor(private transaction: Transaction) {
  }

  /**
   * Add set operation
   * @param {DocumentReference} docRef
   * @param {NonNullable<unknown> | Promise<NonNullable<unknown>>} data
   * @return {void}
   */
  set(docRef: DocumentReference, data: NonNullable<unknown> | Promise<NonNullable<unknown>>) {
    this.setList.push({
      docRef,
      data
    });
  }

  /**
   * Add create operation
   * @param {DocumentReference} docRef
   * @param {NonNullable<unknown> | Promise<NonNullable<unknown>>} data
   * @return {void}
   */
  create(docRef: DocumentReference, data: NonNullable<unknown> | Promise<NonNullable<unknown>>) {
    this.createList.push({
      docRef,
      data
    });
  }

  /**
   * Add update operation
   * @param {DocumentReference} docRef
   * @param {NonNullable<unknown> | Promise<NonNullable<unknown>>} data
   * @return {void}
   */
  update(docRef: DocumentReference, data: NonNullable<unknown> | Promise<NonNullable<unknown>>) {
    this.updateList.push({
      docRef,
      data
    });
  }

  /**
   * Add delete operation
   * @param {DocumentReference} docRef
   * @return {void}
   */
  delete(docRef: DocumentReference) {
    this.deleteList.push({
      docRef
    });
  }

  /**
   * Execute all transactions
   * @return {Promise<Transaction>}
   */
  async execute(): Promise<Transaction> {

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
      Promise.all(updateDataPromise) as Promise<NonNullable<unknown>[]>
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
