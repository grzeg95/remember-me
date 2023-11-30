import {BasicEncryptedValue, decrypt, protectObjectDecryption} from 'utils';
import {EncryptedTodayTask, Round, Task, Today, TodayTask} from '../models';

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
