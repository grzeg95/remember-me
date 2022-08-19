import {Buffer} from 'buffer';
import {
  Round,
  Task,
  Today,
  TodayTask
} from './models';

const crypto = require('crypto');

export type BasicEncryptedValue = { value: string };

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

export const decrypt = (encryptedData: string, cryptoKey: CryptoKey): Promise<string> => {

  const encryptedBase64 = Buffer.from(encryptedData, 'base64');
  const iv_len = 16;
  const iv = encryptedBase64.slice(0, iv_len);
  const encrypted = encryptedBase64.slice(iv_len);

  return crypto.webcrypto.subtle.decrypt({
    name: 'AES-GCM',
    iv
  }, cryptoKey, encrypted)
    .then((text: ArrayBuffer) => Buffer.from(text).toString('utf-8'));
};

export const encryptTask = (task: Task, cryptoKey: CryptoKey): Promise<BasicEncryptedValue> => {
  return encrypt(task, cryptoKey).then((value) => {
    return {value}
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

export const encryptRound = async (round: Round, cryptoKey: CryptoKey): Promise<BasicEncryptedValue> => {
  return encrypt(round, cryptoKey).then((value) => {
    return {value};
  });
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

export const decryptTodayTask = async (encryptedTodayTask: {description: string; timesOfDay: { [key in string]: boolean }}, cryptoKey: CryptoKey): Promise<TodayTask> => {

  const descriptionDecryptPromise = decrypt(encryptedTodayTask.description, cryptoKey);

  const timesOfDay: { [key in string]: boolean } = {};
  const timesOfDayKeysDecryptPromise = [];
  const timesOfDayKeysEncrypted = Object.getOwnPropertyNames(encryptedTodayTask.timesOfDay);

  for (const encryptedKey of timesOfDayKeysEncrypted) {
    timesOfDayKeysDecryptPromise.push(decrypt(encryptedKey, cryptoKey));
  }

  return Promise.all(timesOfDayKeysDecryptPromise).then((timesOfDayKeysDecrypted) => {
    for (const [i, encryptedKey] of timesOfDayKeysEncrypted.entries()) {
      timesOfDay[timesOfDayKeysDecrypted[i]] = (encryptedTodayTask.timesOfDay as { [key in string]: boolean }) [encryptedKey];
    }

    return descriptionDecryptPromise;

  }).then((description) => {
    return {description, timesOfDay};
  });
};

export const encryptToday = async (today: Today, cryptoKey: CryptoKey): Promise<BasicEncryptedValue> => {
  return encrypt(today, cryptoKey).then((value) => {
    return {value};
  });
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
