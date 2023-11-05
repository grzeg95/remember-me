import {DecryptedUser, EncryptedUser} from 'auth';
import {Buffer} from 'buffer';
import {catchError, defer, forkJoin, map, mergeMap, Observable, of, OperatorFunction} from 'rxjs';
import {EncryptedTodayTask, Round, Task, Today, TodayTask} from '../user/models';

export type BasicEncryptedValue = {value: string};

const protectObjectDecryption = <T>(emptyOne: T): OperatorFunction<T, T> => {
  return (source) => {
    return new Observable<T>((observer) => {
      return source.pipe(
        catchError(() => {
          return of(emptyOne);
        }),
        map((obj) => {
          if (typeof obj === 'string' || !obj) {
            return emptyOne;
          }
          return obj;
        })
      ).subscribe({
        next: (value?: T) => observer.next(value),
        error: (e: any) => observer.error(e),
        complete: () => observer.complete()
      });
    });
  };
};

export const getCryptoKey = (secretKey: string): Observable<CryptoKey> => {

  return defer(() => crypto.subtle.importKey(
    'raw',
    Buffer.from(secretKey, 'hex'),
    {name: 'AES-GCM'},
    false,
    ['decrypt']
  ));
}

export const decrypt = <T = string>(encryptedData: string, cryptoKey: CryptoKey): Observable<T | string | null> => {

  if (typeof encryptedData !== 'string' || !encryptedData) {
    return of(null);
  }

  const encryptedBase64 = Buffer.from(encryptedData, 'base64');
  const iv_len = 16;
  const iv = encryptedBase64.slice(0, iv_len);
  const encrypted = encryptedBase64.slice(iv_len);

  return defer(() => crypto.subtle.decrypt({
    name: 'AES-GCM',
    iv
  }, cryptoKey, encrypted)
    .then((arrayBuffer) => {
      const text = Buffer.from(arrayBuffer).toString('utf-8');

      try {
        return JSON.parse(text) as T;
      } catch (e) {
        return text;
      }
    })
    .catch(() => null));
}

export const decryptToday = (encryptedToday: BasicEncryptedValue, cryptoKey: CryptoKey): Observable<Today> => {

  const emptyToday = {
    name: '',
    tasksIds: []
  } as Today;

  return decrypt<Today>(encryptedToday.value, cryptoKey).pipe(protectObjectDecryption(emptyToday));
}

export const decryptUser = (encryptedUser: EncryptedUser, cryptoKey: CryptoKey): Observable<DecryptedUser> => {

  const decryptedRounds$ = decrypt<string[]>(encryptedUser.rounds, cryptoKey).pipe(protectObjectDecryption([]));
  const decryptedPhotoURL$ = decrypt(encryptedUser.photoURL, cryptoKey);

  return forkJoin([decryptedRounds$, decryptedPhotoURL$])
    .pipe(map((res) => {
      return {
        rounds: res[0],
        photoURL: res[1],
        hasEncryptedSecretKey: encryptedUser.hasEncryptedSecretKey
      } as DecryptedUser;
    }));
};

export const decryptTask = (encryptedTask: BasicEncryptedValue | undefined, cryptoKey: CryptoKey): Observable<Task> => {

  const emptyTask = {
    description: '',
    daysOfTheWeek: [],
    timesOfDay: [],
  } as Task;

  return decrypt<Task>(encryptedTask?.value, cryptoKey).pipe(protectObjectDecryption(emptyTask));
};

export const decryptRound = (encryptedRound: BasicEncryptedValue | undefined, cryptoKey: CryptoKey): Observable<Round> => {

  const emptyRound = {
    timesOfDay: [],
    name: '',
    timesOfDayCardinality: [],
    todaysIds: [],
    tasksIds: []
  } as Round;

  return decrypt<Round>(encryptedRound?.value, cryptoKey).pipe(protectObjectDecryption(emptyRound));
};

export const decryptTodayTask = (encryptedTodayTask: EncryptedTodayTask, cryptoKey: CryptoKey): Observable<TodayTask> => {

  const timesOfDay: { [key in string]: boolean } = {};
  const timesOfDayEncryptedMap: { [key in string]: string } = {};

  const decryptedKeysPromise: Observable<string>[] = [];
  const encryptedKeys = Object.getOwnPropertyNames(encryptedTodayTask.timesOfDay);
  const decryptedDescriptionPromise = decrypt(encryptedTodayTask.description, cryptoKey);

  for (const encryptedKey of encryptedKeys) {
    decryptedKeysPromise.push(decrypt(encryptedKey, cryptoKey));
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
      } as TodayTask);
    })
  );
};
