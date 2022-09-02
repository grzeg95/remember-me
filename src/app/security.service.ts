import {Injectable} from '@angular/core';
import {DecryptedUser, EncryptedUser} from 'auth';
import {Buffer} from 'buffer';
import {defer, forkJoin, map, mergeMap, Observable, of} from 'rxjs';
import {EncryptedTodayTask, Round, Task, Today, TodayTask} from './user/models';

export type BasicEncryptedValue = {value: string};

@Injectable()
export class SecurityService {

  constructor() {
  }

  getCryptoKey$(secretKey: string): Observable<CryptoKey> {

    return defer(() => crypto.subtle.importKey(
      'raw',
      Buffer.from(secretKey, 'hex'),
      {name: 'AES-GCM'},
      false,
      ['decrypt']
    ));
  }

  decrypt(encryptedData: string, cryptoKey: CryptoKey): Observable<string> {

    const encryptedBase64 = Buffer.from(encryptedData, 'base64');
    const iv_len = 16;
    const iv = encryptedBase64.slice(0, iv_len);
    const encrypted = encryptedBase64.slice(iv_len);

    return defer(() => crypto.subtle.decrypt({
      name: 'AES-GCM',
      iv
    }, cryptoKey, encrypted)
      .then((text) => Buffer.from(text).toString('utf-8'))
      .catch(() => null));
  }

  decryptToday(encryptedToday: BasicEncryptedValue, cryptoKey: CryptoKey): Observable<Today> {

    if (encryptedToday) {
      return this.decrypt(encryptedToday.value, cryptoKey).pipe(map((today) => JSON.parse(today) as Today));
    }

    return of({
      name: '',
      tasksIds: []
    });
  }

  decryptUser(encryptedUser: EncryptedUser, cryptoKey: CryptoKey): Observable<DecryptedUser> {

    let decryptedRounds$: Observable<string> = of(null);

    if (encryptedUser.rounds) {
      decryptedRounds$ = this.decrypt(encryptedUser.rounds, cryptoKey);
    }

    let decryptedPhotoUrl$: Observable<string> = of(null);

    if (encryptedUser.photoUrl) {
      decryptedPhotoUrl$ = this.decrypt(encryptedUser.photoUrl, cryptoKey);
    }

    return forkJoin<string[]>([decryptedRounds$, decryptedPhotoUrl$])
      .pipe(map((res) => {
        return {
          rounds: JSON.parse(res[0] || '[]'),
          photoUrl: res[1],
          hasEncryptedSecretKey: encryptedUser.hasEncryptedSecretKey
        }
      }));
  };

  decryptTask(encryptedTask: BasicEncryptedValue | undefined, cryptoKey: CryptoKey): Observable<Task> {

    if (encryptedTask) {
      return this.decrypt(encryptedTask.value, cryptoKey).pipe(map((task) => JSON.parse(task) as Task));
    }

    return of({
      description: '',
      daysOfTheWeek: [],
      timesOfDay: [],
    });
  };

  decryptRound(encryptedRound: BasicEncryptedValue | undefined, cryptoKey: CryptoKey): Observable<Round> {

    if (encryptedRound) {
      return this.decrypt(encryptedRound.value, cryptoKey).pipe(map((round) => JSON.parse(round) as Round));
    }

    return of({
      timesOfDay: [],
      name: '',
      timesOfDayCardinality: [],
      todaysIds: [],
      tasksIds: []
    });
  };

  decryptTodayTask(encryptedTodayTask: EncryptedTodayTask, cryptoKey: CryptoKey): Observable<TodayTask> {

    const timesOfDay: { [key in string]: boolean } = {};
    const timesOfDayEncryptedMap: { [key in string]: string } = {};

    const decryptedKeysPromise: Observable<string>[] = [];
    const encryptedKeys = Object.getOwnPropertyNames(encryptedTodayTask.timesOfDay);
    const decryptedDescriptionPromise = this.decrypt(encryptedTodayTask.description, cryptoKey);

    for (const encryptedKey of encryptedKeys) {
      decryptedKeysPromise.push(this.decrypt(encryptedKey, cryptoKey));
    }

    return forkJoin(decryptedKeysPromise).pipe(
      mergeMap((decryptedKeys) => {
        for (const [i, decryptedKey] of decryptedKeys.entries()) {
          timesOfDay[decryptedKey] = (encryptedTodayTask.timesOfDay as { [key in string]: boolean }) [encryptedKeys[i]];
          timesOfDayEncryptedMap[decryptedKey] = encryptedKeys[i];
        }
        return decryptedDescriptionPromise;
      }),
      mergeMap((description) => {
        return of({
          timesOfDay,
          timesOfDayEncryptedMap,
          description
        })
      })
    );
  };
}
