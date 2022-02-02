import {Injectable} from '@angular/core';
import {ConnectionService} from './connection.service';
import {BehaviorSubject} from 'rxjs';

@Injectable()
export class AppService {

  get isOnline$(): BehaviorSubject<boolean> {
    return this._isOnline$;
  }

  private _isOnline$: BehaviorSubject<boolean> = new BehaviorSubject(true);
  private indexedDB = window['indexedDB'] || window['mozIndexedDB'] || window['webkitIndexedDB'] || window['msIndexedDB'];
  db: IDBDatabase;
  dbIsReady$ = new BehaviorSubject<boolean | 'will not'>(false);

  constructor(private connectionService: ConnectionService) {
    this.connectionService.stateChange$.subscribe((isOnline) =>
      this._isOnline$.next(isOnline)
    );

    if (!this.indexedDB) {
      this.dbIsReady$.next('will not');
    } else {
      const reqOpenDb = this.indexedDB.open('remember-me-database', 2);

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
        request['onsuccess'] = () => resolve(true);
      } else {
        reject(false);
      }
    });
  }
}
