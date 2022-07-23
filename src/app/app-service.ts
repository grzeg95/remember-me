import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class AppService {

  private indexedDB = window['indexedDB'] || window['mozIndexedDB'] || window['webkitIndexedDB'] || window['msIndexedDB'];
  private db: IDBDatabase;
  dbIsReady$ = new BehaviorSubject<boolean | 'will not'>(false);

  constructor() {

    if (!this.indexedDB) {
      this.dbIsReady$.next('will not');
    } else {
      const reqOpenDb = this.indexedDB.open('remember-me-database', 1);

      reqOpenDb.onerror = () => this.dbIsReady$.next('will not');

      reqOpenDb.onsuccess = () => {
        this.db = reqOpenDb.result;
        this.dbIsReady$.next(true);
      };

      reqOpenDb.onupgradeneeded = () => {
        this.db = reqOpenDb.result;
        this.db.createObjectStore('remember-me-database-keys');
      };
    }
  }

  addToDb(objectStore: string, key: string, value: any): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const isReady = this.dbIsReady$.value

      if (typeof isReady === 'boolean' && isReady) {
        const request = this.db.transaction([objectStore], 'readwrite');
        request.objectStore(objectStore).put(value, key);

        request.onerror = () => reject(false);
        request.onabort = () => reject(false);
        request.oncomplete = () => resolve(true);
      } else {
        reject(false);
      }
    });
  }

  getFromDb(objectStore: string, key: string): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const isReady = this.dbIsReady$.value

      if (typeof isReady === 'boolean' && isReady) {
        const request = this.db.transaction([objectStore], 'readwrite').objectStore(objectStore).get(key);

        request.onerror = () => reject(undefined);
        request.onsuccess = (evt) => resolve(evt.target['result']);
      } else {
        reject(undefined);
      }
    });
  }

  deleteFromDb(objectStore: string, key: string): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const isReady = this.dbIsReady$.value

      if (typeof isReady === 'boolean' && isReady) {
        const request = this.db.transaction([objectStore], 'readwrite');
        request.objectStore(objectStore).delete(key);

        request.onerror = () => reject(false);
        request.oncomplete = () => resolve(true);
      } else {
        reject(false);
      }
    });
  }

  async getMapOfUsersCryptoKeysFromDb(): Promise<{ [key in string]: CryptoKey }> {
    const listOfUsersIds = await this.getListOfIdsUsersFromDb();
    const usersCryptoKeys: {
      [key in string]: CryptoKey
    } = {};

    for (const id of listOfUsersIds) {
      usersCryptoKeys[id] = (await this.getFromDb('remember-me-database-keys', id));
    }

    return usersCryptoKeys;
  }

  private getListOfIdsUsersFromDb(): Promise<string[]> {
    return new Promise(async (resolve, reject) => {
      const isReady = this.dbIsReady$.value;

      if (typeof isReady === 'boolean' && isReady) {
        const request = this.db.transaction(['remember-me-database-keys'], 'readonly').objectStore('remember-me-database-keys').getAllKeys();

        request.onerror = () => {
          reject(undefined);
        };
        request.onsuccess = (evt) => resolve(evt.target['result']);
      } else {
        reject(undefined);
      }
    });
  }

  async removeAllUsers(): Promise<any> {

    try {
      // get all users and delete others
      const usersFromDb = await this.getMapOfUsersCryptoKeysFromDb();

      const usersToRemovePromise = [];

      for (const id of Object.getOwnPropertyNames(usersFromDb)) {
        usersToRemovePromise.push(this.deleteFromDb('remember-me-database-keys', id));
      }

      await Promise.all(usersToRemovePromise);
    } catch (e) {
    }
  }
}
