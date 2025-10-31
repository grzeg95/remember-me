import {DocumentReference, DocumentSnapshot, Transaction} from 'firebase-admin/firestore';

type TransactionWriteItemData = NonNullable<unknown> | Promise<NonNullable<unknown>>;

type TransactionWriteItem = {
  docRef: DocumentReference,
  data: TransactionWriteItemData
}

type TransactionDeleteItem = {
  docRef: DocumentReference
}

/**
 * @class TransactionWrite
 */
export class TransactionWrite {

  private _set: TransactionWriteItem[] = [];
  private _create: TransactionWriteItem[] = [];
  private _update: TransactionWriteItem[] = [];
  private _delete: TransactionDeleteItem[] = [];

  /**
   * Create TransactionWrite for specific Transaction
   * */
  constructor(
    private readonly _transaction: Transaction
  ) {
  }

  /**
   * Add set operation
   * @param {DocumentReference} docRef
   * @param {NonNullable<unknown> | Promise<NonNullable<unknown>>} data
   * @return {void}
   */
  set(docRef: DocumentReference, data: NonNullable<unknown> | Promise<NonNullable<unknown>>) {
    this._set.push({
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
    this._create.push({
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
    this._update.push({
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
    this._delete.push({
      docRef
    });
  }

  /**
   * Add delete all operation
   * @param {DocumentSnapshot[]} docSnaps
   * @return {void}
   */
  deleteAll(docSnaps: DocumentSnapshot[]) {

    for (const docSnap of docSnaps) {
      this._delete.push({
        docRef: docSnap.ref
      });
    }
  }

  /**
   * Execute all transactions
   * @return {Promise<Transaction>}
   */
  async execute(): Promise<Transaction> {

    const setDataPromise: TransactionWriteItemData[] = [];
    const createDataPromise: TransactionWriteItemData[] = [];
    const updateDataPromise: TransactionWriteItemData[] = [];

    for (const item of this._set) {
      setDataPromise.push(item.data);
    }

    for (const item of this._create) {
      createDataPromise.push(item.data);
    }

    for (const item of this._update) {
      updateDataPromise.push(item.data);
    }

    return Promise.all([
      Promise.all(setDataPromise),
      Promise.all(createDataPromise),
      Promise.all(updateDataPromise)
    ]).then(([setData, createData, updateData]) => {

      for (const [i, item] of this._set.entries()) {
        this._transaction.set(item.docRef, setData[i]);
      }

      for (const [i, item] of this._create.entries()) {
        this._transaction.create(item.docRef, createData[i]);
      }

      for (const [i, item] of this._update.entries()) {
        this._transaction.update(item.docRef, updateData[i]);
      }

      for (const item of this._delete) {
        this._transaction.delete(item.docRef);
      }

      this._delete = [];
      this._set = [];
      this._update = [];
      this._create = [];

      return this._transaction;
    });
  }
}
