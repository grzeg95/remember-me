import {DocumentData, QueryDocumentSnapshot, SnapshotOptions} from 'firebase/firestore';
import {EncryptedUser} from './auth/user-data.model';
import {EncryptedTodayTask, Round, Task, Today, TodayTask} from './user/models';
import {Buffer} from 'buffer';

export type BasicEncryptedValue = { value: string };

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
      rounds: data.rounds
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

export const decrypt = async (encryptedData: string, cryptoKey: CryptoKey): Promise<string> => {

  const encryptedBase64 = Buffer.from(encryptedData, 'base64');
  const iv_len = 16;
  const iv = encryptedBase64.slice(0, iv_len);
  const encrypted = encryptedBase64.slice(iv_len);

  try {
    return Buffer.from(await crypto.subtle.decrypt({
      name: 'AES-GCM',
      iv
    }, cryptoKey, encrypted)).toString('utf-8');
  } catch (e) {}

  return null;
};

export const decryptTask = async (encryptedTask: BasicEncryptedValue | undefined, cryptoKey: CryptoKey): Promise<Task> => {

  if (encryptedTask) {
    return JSON.parse(await decrypt(encryptedTask.value, cryptoKey));
  }

  return {
    description: '',
    daysOfTheWeek: [],
    timesOfDay: [],
  };
};

export const decryptRound = async (encryptedRound: BasicEncryptedValue | undefined, cryptoKey: CryptoKey): Promise<Round> => {

  if (encryptedRound) {
    return JSON.parse(await decrypt(encryptedRound.value, cryptoKey));
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

  for (const encryptedKey of Object.getOwnPropertyNames(encryptedTodayTask.timesOfDay)) {
    const decryptedKey = await decrypt(encryptedKey, cryptoKey);
    timesOfDay[decryptedKey] = (encryptedTodayTask.timesOfDay as { [key in string]: boolean }) [encryptedKey];
    timesOfDayEncryptedMap[decryptedKey] = encryptedKey;
  }

  return {
    description: await decrypt(encryptedTodayTask.description, cryptoKey),
    timesOfDay,
    timesOfDayEncryptedMap
  };
};

export const decryptToday = async (encryptedToday: BasicEncryptedValue, cryptoKey: CryptoKey): Promise<Today> => {

  if (encryptedToday) {
    return JSON.parse(await decrypt(encryptedToday.value, cryptoKey));
  }

  return {
    name: '',
    tasksIds: []
  };
};
