import {Buffer} from 'buffer';
import {cryptoKeyVersionPath, keyManagementServiceClient} from '../config';
import {
  Round,
  Task,
  Today,
  TodayTask
} from '../helpers/models';
import {testRequirement} from '../helpers/test-requirement';

const crc32c = require('fast-crc32c');
const crypto = require('crypto');
const {subtle} = require('crypto').webcrypto;

const cryptoKeyBuffer: {
  [key in string]: CryptoKey
} = {};

export const getCryptoKey = async (key: string, uid: string | undefined): Promise<CryptoKey> => {

  if (uid && cryptoKeyBuffer[uid]) {
    return cryptoKeyBuffer[uid];
  } else {
    const cryptoKey = await subtle.importKey(
      'raw',
      Buffer.from(key, 'hex'),
      {
        name: 'AES-GCM'
      },
      false,
      ['decrypt', 'encrypt']
    );

    if (uid) {
      cryptoKeyBuffer[uid] = cryptoKey;
    }

    return cryptoKey;
  }
};

export const decryptSymmetricKey = async (encryptedSymmetricKey: string, uid: string | undefined): Promise<CryptoKey> => {

  if (uid && cryptoKeyBuffer[uid]) {
    return cryptoKeyBuffer[uid];
  }

  // @ts-ignore
  const ciphertext = new Uint8Array(encryptedSymmetricKey.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

  const ciphertextCrc32c = crc32c.calculate(ciphertext);

  const [decryptResponse] = await keyManagementServiceClient.asymmetricDecrypt({
    name: cryptoKeyVersionPath,
    ciphertext,
    ciphertextCrc32c: {
      value: ciphertextCrc32c
    },
  });

  testRequirement(
    !decryptResponse.verifiedCiphertextCrc32c ||
    crc32c.calculate(decryptResponse.plaintext) !==
    Number(decryptResponse.plaintextCrc32c?.value),
    'AsymmetricDecrypt: request corrupted in-transit'
  );

  const key = (decryptResponse.plaintext || '').toString();

  return await getCryptoKey(key, uid);
};

export const encrypt = async (data: any, cryptoKey: CryptoKey): Promise<string> => {

  let dataString = '';

  if (typeof data === 'string') {
    dataString = data;
  } else {
    dataString = JSON.stringify(data);
  }

  const iv = crypto.randomBytes(16);
  const dataBuffer = Buffer.from(dataString);

  const encrypted = await subtle.encrypt({
    name: 'AES-GCM',
    iv
  }, cryptoKey, dataBuffer);

  return Buffer.concat([iv, Buffer.from(encrypted)]).toString('base64');
};

export const decrypt = async (encryptedData: string, cryptoKey: CryptoKey): Promise<string> => {

  const encryptedBase64 = Buffer.from(encryptedData, 'base64');
  const iv_len = 16;
  const iv = encryptedBase64.slice(0, iv_len);
  const encrypted = encryptedBase64.slice(iv_len);

  return Buffer.from(await subtle.decrypt({
    name: 'AES-GCM',
    iv
  }, cryptoKey, encrypted)).toString('utf-8');
};

export const encryptTask = async (task: Task, cryptoKey: CryptoKey): Promise<{value: string}> => {
  return {
    value: await encrypt(task, cryptoKey)
  };
};

export const decryptTask = async (encryptedTask: {value: string} | undefined, cryptoKey: CryptoKey): Promise<Task> => {

  if (encryptedTask) {
    try {
      return JSON.parse(await decrypt(encryptedTask.value, cryptoKey));
    } catch (e) {
    }
  }

  return {
    description: '',
    daysOfTheWeek: [],
    timesOfDay: [],
  };
};

export const encryptRound = async (round: Round, cryptoKey: CryptoKey): Promise<{value: string}> => {
  return {
    value: await encrypt(round, cryptoKey)
  };
};

export const decryptRound = async (encryptedRound: {value: string} | undefined, cryptoKey: CryptoKey): Promise<Round> => {

  if (encryptedRound) {

    try {
      return JSON.parse(await decrypt(encryptedRound.value, cryptoKey));
    } catch (e) {
    }
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
  const timeOfDayArr = [];
  for (const timeOfDay of Object.keys(todayTask.timesOfDay)) {
    timeOfDayEncryptArrPromise.push(encrypt(timeOfDay, cryptoKey));
    timeOfDayArr.push(timeOfDay);
  }

  const timeOfDayEncryptArr = await Promise.all(timeOfDayEncryptArrPromise);

  for (const [i, encryptedTimeOfDay] of timeOfDayEncryptArr.entries()) {
    timesOfDay[encryptedTimeOfDay] = todayTask.timesOfDay[timeOfDayArr[i]];
  }

  return {
    description: await descriptionEncryptPromise,
    timesOfDay
  };
};

export const decryptTodayTask = async (encryptedTodayTask: {description: string; timesOfDay: { [key in string]: boolean }}, cryptoKey: CryptoKey): Promise<TodayTask> => {

  const descriptionDecryptPromise = decrypt(encryptedTodayTask.description, cryptoKey);

  const timesOfDay: { [key in string]: boolean } = {};
  const timesOfDayKeysDecryptPromise = [];
  const timesOfDayKeysEncrypted = Object.getOwnPropertyNames(encryptedTodayTask.timesOfDay);

  for (const encryptedKey of timesOfDayKeysEncrypted) {
    timesOfDayKeysDecryptPromise.push(decrypt(encryptedKey, cryptoKey));
  }

  const timesOfDayKeysDecrypted = await Promise.all(timesOfDayKeysDecryptPromise);
  for (const [i, encryptedKey] of timesOfDayKeysEncrypted.entries()) {
    timesOfDay[timesOfDayKeysDecrypted[i]] = (encryptedTodayTask.timesOfDay as { [key in string]: boolean }) [encryptedKey];
  }

  return {
    description: await descriptionDecryptPromise,
    timesOfDay
  };
};

export const encryptToday = async (today: Today, cryptoKey: CryptoKey): Promise<{value: string}> => {
  return {
    value: await encrypt(today, cryptoKey)
  };
};

export const decryptToday = async (encryptedToday: {value: string}, cryptoKey: CryptoKey): Promise<Today> => {

  if (encryptedToday) {

    try {
      return JSON.parse(await decrypt(encryptedToday.value, cryptoKey));
    } catch (e) {
    }
  }

  return {
    name: '',
    tasksIds: []
  };
};
