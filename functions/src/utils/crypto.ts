import {Buffer} from 'buffer';
import {RoundDocUncrypded} from '../models/round';
import {Task} from '../models/task';
import {Today} from '../models/today';
import {TodayTask} from '../models/today-task';
import crypto = require('crypto');

export type BasicEncryptedValue = {value: string};

export const getCryptoKey = (key: string): Promise<CryptoKey> => {

  return crypto.webcrypto.subtle.importKey(
    'raw',
    Buffer.from(key, 'hex'),
    {
      name: 'AES-GCM'
    },
    false,
    ['decrypt', 'encrypt']
  );
};

export const encrypt = (data: any, cryptoKey: CryptoKey): Promise<string> => {

  let dataString;

  if (typeof data === 'string') {
    dataString = data;
  } else {
    dataString = JSON.stringify(data);
  }

  const iv = crypto.randomBytes(16);
  const dataBuffer = Buffer.from(dataString);

  return crypto.webcrypto.subtle.encrypt({
    name: 'AES-GCM',
    iv
  }, cryptoKey, dataBuffer)
    .then((encrypted: ArrayBuffer) => {
      return Buffer.concat([iv, Buffer.from(encrypted)]).toString('base64');
    });
};

export const decrypt = async <T = string>(encryptedData: string | null | undefined, cryptoKey: CryptoKey): Promise<T | null> => {

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
        return text as T;
      }
    });
};

export const encryptTask = (task: Task, cryptoKey: CryptoKey): Promise<BasicEncryptedValue> => {
  return encrypt(task, cryptoKey).then((value) => {
    return {value};
  });
};

export const encryptRound = async (round: RoundDocUncrypded, cryptoKey: CryptoKey): Promise<BasicEncryptedValue> => {
  return encrypt(round, cryptoKey).then((value) => {
    return {value};
  });
};

export const encryptTodayTask = async (todayTask: TodayTask, cryptoKey: CryptoKey): Promise<{ [key in string]: string | { [timeOfDay in string]: boolean } }> => {

  const descriptionEncryptPromise = encrypt(todayTask.description, cryptoKey);

  const timesOfDay: { [k in string]: boolean } = {};

  const timeOfDayEncryptArrPromise = [];
  const timeOfDayArr: string[] = [];
  for (const timeOfDay of Object.keys(todayTask.timesOfDay)) {
    timeOfDayEncryptArrPromise.push(encrypt(timeOfDay, cryptoKey));
    timeOfDayArr.push(timeOfDay);
  }

  return Promise.all(timeOfDayEncryptArrPromise).then((timeOfDayEncryptArr) => {
    for (const [i, encryptedTimeOfDay] of timeOfDayEncryptArr.entries()) {
      timesOfDay[encryptedTimeOfDay] = todayTask.timesOfDay[timeOfDayArr[i]];
    }

    return descriptionEncryptPromise;

  }).then((description) => {
    return {description, timesOfDay};
  });
};

export const encryptToday = async (today: Today, cryptoKey: CryptoKey): Promise<BasicEncryptedValue> => {
  return encrypt(today, cryptoKey).then((value) => {
    return {value};
  });
};
