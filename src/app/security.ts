import {Buffer} from 'buffer';
import {DocumentData, QueryDocumentSnapshot, SnapshotOptions} from 'firebase/firestore';
import {DecryptedUser, EncryptedUser} from './auth/user-data.model';
import {EncryptedTodayTask, Round, Task, Today, TodayTask} from './user/models';

export type BasicEncryptedValue = {value: string};

export const basicEncryptedValueConverter = {
  toFirestore(): DocumentData {
    return {};
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): BasicEncryptedValue {
    const data = snapshot.data(options)!;
    return {
      value: data.value
    } as BasicEncryptedValue;
  }
};

export const userConverter = {
  toFirestore(): DocumentData {
    return {};
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): EncryptedUser {
    const data = snapshot.data(options)!;
    return {
      hasEncryptedSecretKey: data.hasEncryptedSecretKey,
      rounds: data.rounds,
      photoUrl: data.photoUrl
    } as EncryptedUser;
  }
};

export const encryptedTodayTaskConverter = {
  toFirestore(): DocumentData {
    return {};
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): EncryptedTodayTask {
    const data = snapshot.data(options)!;
    return {
      description: data.description,
      timesOfDay: data.timesOfDay
    } as EncryptedTodayTask;
  }
};

export const decrypt = (encryptedData: string, cryptoKey: CryptoKey): Promise<string> => {

  const encryptedBase64 = Buffer.from(encryptedData, 'base64');
  const iv_len = 16;
  const iv = encryptedBase64.slice(0, iv_len);
  const encrypted = encryptedBase64.slice(iv_len);

  return crypto.subtle.decrypt({
    name: 'AES-GCM',
    iv
  }, cryptoKey, encrypted)
    .then((text) => Buffer.from(text).toString('utf-8'))
    .catch(() => null);
};

export const decryptUser = (encryptedUser: EncryptedUser, cryptoKey: CryptoKey): Promise<DecryptedUser> => {

  let decryptedRoundsPromise = undefined;

  if (encryptedUser.rounds) {
    decryptedRoundsPromise = decrypt(encryptedUser.rounds, cryptoKey);
  }

  let decryptedPhotoUrlPromise = undefined;

  if (encryptedUser.photoUrl) {
    decryptedPhotoUrlPromise = decrypt(encryptedUser.photoUrl, cryptoKey);
  }

  return Promise.all([decryptedRoundsPromise, decryptedPhotoUrlPromise])
    .then(([rounds, photoUrl]) => {
      return {
        rounds: JSON.parse(rounds || []),
        photoUrl,
        hasEncryptedSecretKey: encryptedUser.hasEncryptedSecretKey
      }
    });
};

export const decryptTask = async (encryptedTask: BasicEncryptedValue | undefined, cryptoKey: CryptoKey): Promise<Task> => {

  if (encryptedTask) {
    return decrypt(encryptedTask.value, cryptoKey).then((task) => JSON.parse(task) as Task);
  }

  return {
    description: '',
    daysOfTheWeek: [],
    timesOfDay: [],
  };
};

export const decryptRound = async (encryptedRound: BasicEncryptedValue | undefined, cryptoKey: CryptoKey): Promise<Round> => {

  if (encryptedRound) {
    return decrypt(encryptedRound.value, cryptoKey).then((round) => JSON.parse(round) as Round);
  }

  return {
    timesOfDay: [],
    name: '',
    timesOfDayCardinality: [],
    todaysIds: [],
    tasksIds: []
  };
};

export const decryptTodayTask = async (encryptedTodayTask: EncryptedTodayTask, cryptoKey: CryptoKey): Promise<TodayTask> => {

  const timesOfDay: { [key in string]: boolean } = {};
  const timesOfDayEncryptedMap: { [key in string]: string } = {};

  const decryptedKeysPromise: Promise<string>[] = [];
  const encryptedKeys = Object.getOwnPropertyNames(encryptedTodayTask.timesOfDay);
  const decryptedDescriptionPromise = decrypt(encryptedTodayTask.description, cryptoKey);

  for (const encryptedKey of encryptedKeys) {
    decryptedKeysPromise.push(decrypt(encryptedKey, cryptoKey));
  }

  return Promise.all(decryptedKeysPromise).then((decryptedKeys) => {
    for (const [i, decryptedKey] of decryptedKeys.entries()) {
      timesOfDay[decryptedKey] = (encryptedTodayTask.timesOfDay as { [key in string]: boolean }) [encryptedKeys[i]];
      timesOfDayEncryptedMap[decryptedKey] = encryptedKeys[i];
    }
    return decryptedDescriptionPromise;
  }).then((description) => {
    return {
      timesOfDay,
      timesOfDayEncryptedMap,
      description
    };
  })
};

export const decryptToday = async (encryptedToday: BasicEncryptedValue, cryptoKey: CryptoKey): Promise<Today> => {

  if (encryptedToday) {
    return decrypt(encryptedToday.value, cryptoKey).then((today) => JSON.parse(today) as Today);
  }

  return {
    name: '',
    tasksIds: []
  };
};
