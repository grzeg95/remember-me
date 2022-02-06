import {Today} from '../../functions/src/helpers/models';
import {Round, Task, TodayTask} from './user/models';
import {Buffer} from 'buffer';

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

export const decryptTask = async (encryptedTask: { value: string } | undefined, cryptoKey: CryptoKey): Promise<Task> => {

  if (encryptedTask) {
    try {
      return JSON.parse(await decrypt(encryptedTask.value, cryptoKey));
    } catch (e) {
      console.log('decryptTask');
      throw e;
    }
  }

  return {
    description: '',
    daysOfTheWeek: [],
    timesOfDay: [],
  };
};

export const decryptRound = async (encryptedRound: { value: string } | undefined, cryptoKey: CryptoKey): Promise<Round> => {

  if (encryptedRound) {

    try {
      return JSON.parse(await decrypt(encryptedRound.value, cryptoKey));
    } catch (e) {
      console.log('decryptRound');
      throw e;
    }
  }

  return {
    taskSize: 0,
    timesOfDay: [],
    name: '',
    timesOfDayCardinality: []
  };
};

export const decryptTodayTask = async (encryptedTodayTask: { description: string; timesOfDay: { [key in string]: boolean } }, cryptoKey: CryptoKey): Promise<TodayTask> => {

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

export const decryptToday = async (encryptedToday: { value: string }, cryptoKey: CryptoKey): Promise<Today> => {

  if (encryptedToday) {
    return JSON.parse(await decrypt(encryptedToday.value, cryptoKey));
  }

  return {
    name: '',
    taskSize: 0
  };
};
