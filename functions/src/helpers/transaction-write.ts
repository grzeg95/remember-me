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

  async setExecute() {
    for (const item of this.setList) {
      let data: any = item.data;

      if (data?.constructor.name === 'Promise') {
        data = await data;
      }

      // @ts-ignore
      this.transaction.set(item.docRef, data);
    }

    this.setList = [];
  }

  async createExecute() {
    for (const item of this.createList) {
      let data: any = item.data;

      if (data?.constructor.name === 'Promise') {
        data = await data;
      }

      this.transaction.create(item.docRef, data);
    }

    this.createList = [];
  }

  async updateExecute() {
    for (const item of this.updateList) {
      let data: any = item.data;

      if (data?.constructor.name === 'Promise') {
        data = await data;
      }

      this.transaction.update(item.docRef, data);
    }

    this.updateList = [];
  }

  async deleteExecute() {
    for (const item of this.deleteList) {
      this.transaction.delete(item.docRef);
    }

    this.deleteList = [];
  }

  async execute() {
    await this.setExecute();
    await this.createExecute();
    await this.updateExecute();
    await this.deleteExecute();
  }
}
