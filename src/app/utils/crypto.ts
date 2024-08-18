
import {Buffer} from 'buffer';
import {EncryptedTodayTask, Round, Task, Today, TodayTask} from '../models/models';
import {DecryptedUser, EncryptedUser} from '../models/user-data.model';

export type BasicEncryptedValue = {value: string};

export const protectObjectDecryption = <T>(emptyOne: T): (value: any) => Promise<T> => {
  return async (value: T) => {
    if (typeof value === 'string' || !value) {
      return emptyOne;
    }
    return value;
  };
}

export const getCryptoKey = (secretKey: string): Promise<CryptoKey> => {
  return crypto.subtle.importKey(
    'raw',
    Buffer.from(secretKey, 'hex'),
    {name: 'AES-GCM'},
    false,
    ['decrypt']
  );
}

export const decrypt = async <T = string>(encryptedData: string | null | undefined, cryptoKey: CryptoKey): Promise<T | string | null> => {

  if (!encryptedData) {
    return null;
  }

  const encryptedBase64 = Buffer.from(encryptedData, 'base64');
  const iv_len = 16;
  const iv = encryptedBase64.slice(0, iv_len);
  const encrypted = encryptedBase64.slice(iv_len);

  return crypto.subtle.decrypt({
    name: 'AES-GCM',
    iv
  }, cryptoKey, encrypted)
    .then((arrayBuffer) => {
      const text = Buffer.from(arrayBuffer).toString('utf-8');

      try {
        return JSON.parse(text) as T;
      } catch {
        return text;
      }
    });
}

export const decryptUser = async (encryptedUser: EncryptedUser, cryptoKey: CryptoKey): Promise<DecryptedUser> => {

  const decryptedRoundsPromise = decrypt<string[]>(encryptedUser.rounds, cryptoKey).then(protectObjectDecryption<string[]>([]));
  const decryptedPhotoURLPromise = decrypt(encryptedUser.photoURL, cryptoKey);

  return Promise.all([
    decryptedRoundsPromise,
    decryptedPhotoURLPromise
  ]).then(([
    decryptedRounds,
    decryptedPhotoURL
  ]) => {
    return {
      rounds: decryptedRounds,
      photoURL: decryptedPhotoURL,
      hasEncryptedSecretKey: encryptedUser.hasEncryptedSecretKey
    } as DecryptedUser;
  });
};

export const decryptRound = (encryptedRound: BasicEncryptedValue | undefined, cryptoKey: CryptoKey): Promise<Round> => {

  const emptyRound = {
    timesOfDay: [],
    name: '',
    timesOfDayCardinality: [],
    todaysIds: [],
    tasksIds: [],
    id: 'null'
  } as Round;

  return decrypt<Round>(encryptedRound?.value as string, cryptoKey).then(protectObjectDecryption(emptyRound));
};

export const decryptToday = (encryptedToday: BasicEncryptedValue, cryptoKey: CryptoKey): Promise<Today> => {

  const emptyToday = {
    name: '',
    tasksIds: []
  } as Today;

  return decrypt<Today>(encryptedToday.value, cryptoKey).then(protectObjectDecryption(emptyToday));
}

export const decryptTask = (encryptedTask: BasicEncryptedValue | undefined, cryptoKey: CryptoKey): Promise<Task> => {

  const emptyTask = {
    description: '',
    daysOfTheWeek: [],
    timesOfDay: [],
    id: 'null'
  } as Task;

  return decrypt<Task>(encryptedTask?.value as string, cryptoKey).then(protectObjectDecryption(emptyTask));
};

export const decryptTodayTask = async (encryptedTodayTask: EncryptedTodayTask, cryptoKey: CryptoKey): Promise<TodayTask> => {

  const timesOfDay: { [key in string]: boolean } = {};
  const timesOfDayEncryptedMap: { [key in string]: string } = {};

  const decryptedKeysPromise: Promise<string | null>[] = [];
  const encryptedKeys = Object.getOwnPropertyNames(encryptedTodayTask.timesOfDay);
  const decryptedDescriptionPromise = decrypt(encryptedTodayTask.description, cryptoKey);

  for (const encryptedKey of encryptedKeys) {
    decryptedKeysPromise.push(decrypt(encryptedKey, cryptoKey));
  }

  const decryptedKeys = await Promise.all(decryptedKeysPromise);
  const description = await decryptedDescriptionPromise;

  for (const [i, decryptedKey] of decryptedKeys.entries()) {
    timesOfDay[decryptedKey as string] = (encryptedTodayTask.timesOfDay as { [key in string]: boolean }) [encryptedKeys[i]];
    timesOfDayEncryptedMap[decryptedKey as string] = encryptedKeys[i];
  }

  return {
    timesOfDay,
    timesOfDayEncryptedMap,
    description
  } as TodayTask;
};
