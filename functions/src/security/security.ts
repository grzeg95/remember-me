import {Buffer} from 'buffer';
import {cryptoKeyVersionPath, keyManagementServiceClient} from '../config';
import {
  EncryptedRound, EncryptedRoundWithoutName, EncryptedRoundWithoutNameAndTaskSize,
  EncryptedTask,
  EncryptedToday,
  EncryptedTodayTask,
  Round, RoundWithoutName, RoundWithoutNameAndTaskSize,
  Task,
  Today,
  TodayTask
} from '../helpers/models';
import {testRequirement} from '../helpers/test-requirement';

const crc32c = require('fast-crc32c');
const crypto = require('crypto');
const { subtle } = require('crypto').webcrypto;

export const getCryptoKey = async (key: string): Promise<CryptoKey> => {
  return await subtle.importKey(
    'raw',
    Buffer.from(key),
    {
      name: 'AES-CBC'
    },
    false,
    ['decrypt', 'encrypt']
  );
};

export const decryptSymmetricKey = async (encryptedSymmetricKey: string): Promise<CryptoKey> => {

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

  return await getCryptoKey(key);
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
    name: 'AES-CBC',
    iv
  }, cryptoKey, dataBuffer);

  return Buffer.concat([iv, toBuffer(encrypted)]).toString('base64')
}

export const toBuffer = (ab: ArrayBuffer): Buffer => {
  const buf = Buffer.alloc(ab.byteLength);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buf.length; ++i) {
    buf[i] = view[i];
  }
  return buf;
}

export const decrypt = async (encryptedData: string, cryptoKey: CryptoKey): Promise<string> => {

  const encryptedBase64 = Buffer.from(encryptedData, 'base64');
  const iv_len = 16;
  const iv = encryptedBase64.slice(0, iv_len);
  const encrypted = encryptedBase64.slice(iv_len);

  const decrypted = toBuffer(await subtle.decrypt({
    name: 'AES-CBC',
    iv
  }, cryptoKey, encrypted)).toString('utf-8');

  return decrypted;
}

export const encrypt_1 = (data: any, symmetricKey: string): string => {

  let dataString = '';

  if (typeof data === 'string') {
    dataString = data;
  } else {
    dataString = JSON.stringify(data);
  }

  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(symmetricKey, salt, 100000, 256/8, 'sha256');

  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  cipher.write(dataString);
  cipher.end()

  const encrypted = cipher.read();

  const encryptedData = {
    iv: iv.toString('base64'),
    salt: salt.toString('base64'),
    encrypted: encrypted.toString('base64'),
    concatenned: Buffer.concat([salt, iv, encrypted]).toString('base64')
  };

  return encryptedData.concatenned;
};

export const decrypt_1 = (data: string, symmetricKey: string): string => {

  const encrypted = Buffer.from(data, 'base64');
  const salt_len = 16;
  const iv_len = 16;

  const salt = encrypted.slice(0, salt_len);
  const iv = encrypted.slice(salt_len, salt_len+iv_len);
  const key = crypto.pbkdf2Sync(symmetricKey, salt, 100000, 256/8, 'sha256');

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

  decipher.write(encrypted.slice(salt_len+iv_len));
  decipher.end();

  return decipher.read().toString();
};

export const encryptTask = async (task: Task, cryptoKey: CryptoKey): Promise<EncryptedTask> => {
  return {
    description: await encrypt(task.description, cryptoKey),
    timesOfDay: await encrypt(task.timesOfDay, cryptoKey),
    daysOfTheWeek: await encrypt(task.daysOfTheWeek, cryptoKey)
  };
};

export const decryptTask = async (encryptedTask: EncryptedTask, cryptoKey: CryptoKey): Promise<Task> => {

  let daysOfTheWeek = [];
  try {
    daysOfTheWeek = JSON.parse(await decrypt(encryptedTask.daysOfTheWeek, cryptoKey));
  } catch (e) {
  }

  let timesOfDay = [];
  try {
    timesOfDay = JSON.parse(await decrypt(encryptedTask.timesOfDay, cryptoKey));
  } catch (e) {
  }

  let description = '';

  try {
    description = await decrypt(encryptedTask.description, cryptoKey);
  } catch (e) {
  }

  return {
    description,
    daysOfTheWeek,
    timesOfDay,
  };
};

export const decryptTaskTimesOfDay = async (encryptedTask: EncryptedTask, cryptoKey: CryptoKey): Promise<string[]> => {

  try {
    return JSON.parse(await decrypt(encryptedTask.timesOfDay, cryptoKey));
  } catch (e) {
    return [];
  }
};

export const encryptRound = async (round: Round, cryptoKey: CryptoKey): Promise<EncryptedRound> => {
  return {
    name: await encrypt(round.name, cryptoKey),
    taskSize: await encrypt(round.taskSize, cryptoKey),
    timesOfDayCardinality: await encrypt(round.timesOfDayCardinality, cryptoKey),
    timesOfDay: await Promise.all(round.timesOfDay.map(async (timeOfDay) => await encrypt(timeOfDay, cryptoKey)))
  };
};

export const encryptRoundWithoutName = async (roundWithoutName: RoundWithoutName, cryptoKey: CryptoKey): Promise<EncryptedRoundWithoutName> => {
  return {
    taskSize: await encrypt(roundWithoutName.taskSize, cryptoKey),
    timesOfDayCardinality: await encrypt(roundWithoutName.timesOfDayCardinality, cryptoKey),
    timesOfDay: await Promise.all(roundWithoutName.timesOfDay.map(async (timeOfDay) => await encrypt(timeOfDay, cryptoKey)))
  };
};

export const encryptRoundWithoutNameAndTaskSize = async (roundWithoutName: RoundWithoutNameAndTaskSize, cryptoKey: CryptoKey): Promise<EncryptedRoundWithoutNameAndTaskSize> => {
  return {
    timesOfDayCardinality: await encrypt(roundWithoutName.timesOfDayCardinality, cryptoKey),
    timesOfDay: await Promise.all(roundWithoutName.timesOfDay.map(async (timeOfDay) => await encrypt(timeOfDay, cryptoKey)))
  };
};

// for unit tests
export const decryptRound = async (encryptedRound: EncryptedRound, cryptoKey: CryptoKey): Promise<Round> => {

  let timesOfDayCardinality = [];
  try {
    timesOfDayCardinality = JSON.parse(await decrypt(encryptedRound.timesOfDayCardinality, cryptoKey))
  } catch (e) {
  }

  return {
    name: await decrypt(encryptedRound.name, cryptoKey),
    taskSize: +(await decrypt(encryptedRound.taskSize, cryptoKey) || 0),
    timesOfDay: await Promise.all(encryptedRound.timesOfDay.map(async (timeOfDay) => await decrypt(timeOfDay, cryptoKey))),
    timesOfDayCardinality
  };
}

export const decryptRoundName = async (encryptedRound: EncryptedRound, cryptoKey: CryptoKey): Promise<string> => {
  return await decrypt(encryptedRound.name, cryptoKey);
};

export const decryptRoundWithoutName = async (encryptedRound: EncryptedRound, cryptoKey: CryptoKey): Promise<RoundWithoutName> => {

  let timesOfDayCardinality = [];
  try {
    timesOfDayCardinality = JSON.parse(await decrypt(encryptedRound.timesOfDayCardinality, cryptoKey));
  } catch (e) {
  }

  return {
    taskSize: +(await decrypt(encryptedRound.taskSize, cryptoKey) || 0),
    timesOfDay: await Promise.all(encryptedRound.timesOfDay.map(async (timeOfDay) => await decrypt(timeOfDay, cryptoKey))),
    timesOfDayCardinality
  };
};

export const decryptRoundWithoutNameAndTaskSize = async (encryptedRound: EncryptedRound, cryptoKey: CryptoKey): Promise<RoundWithoutNameAndTaskSize> => {

  let timesOfDayCardinality = [];
  try {
    timesOfDayCardinality = JSON.parse(await decrypt(encryptedRound.timesOfDayCardinality, cryptoKey));
  } catch (e) {
  }

  return {
    timesOfDay: await Promise.all(encryptedRound.timesOfDay.map(async (timeOfDay) => await decrypt(timeOfDay, cryptoKey))),
    timesOfDayCardinality
  };
};

export const encryptTodayTask = async (todayTask: TodayTask, cryptoKey: CryptoKey): Promise<EncryptedTodayTask> => {

  const timesOfDay: { [k in string]: boolean } = {};
  for (const timeOfDay of Object.keys(todayTask.timesOfDay)) {
    timesOfDay[await encrypt(timeOfDay, cryptoKey)] = todayTask.timesOfDay[timeOfDay];
  }

  return {
    description: await encrypt(todayTask.description, cryptoKey),
    timesOfDay,
  };
};

export const decryptTodayTask = async (encryptedTodayTask: EncryptedTodayTask, cryptoKey: CryptoKey): Promise<TodayTask> => {

  const timesOfDay: { [k in string]: boolean } = {};
  for (const encryptedTimeOfDayName of Object.keys(encryptedTodayTask.timesOfDay)) {
    timesOfDay[await decrypt(encryptedTimeOfDayName, cryptoKey)] = encryptedTodayTask.timesOfDay[encryptedTimeOfDayName];
  }

  return {
    description: await decrypt(encryptedTodayTask.description, cryptoKey),
    timesOfDay,
  };
};

export const encryptToday = async (today: Today, cryptoKey: CryptoKey): Promise<EncryptedToday> => {
  return {
    name: await encrypt(today.name, cryptoKey),
    taskSize: await encrypt(today.taskSize, cryptoKey)
  };
};

export const decryptToday = async (encryptedToday: EncryptedToday, cryptoKey: CryptoKey): Promise<Today> => {
  return {
    name: await decrypt(encryptedToday.name, cryptoKey),
    taskSize: +(await decrypt(encryptedToday.taskSize, cryptoKey))
  };
};
