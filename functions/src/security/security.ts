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

const cryptoKeyBuffer: {
  [key in string]: CryptoKey
} = {};

export const getCryptoKey = async (key: string, uid: string | undefined): Promise<CryptoKey> => {

  if (uid && cryptoKeyBuffer[uid]) {
    return cryptoKeyBuffer[uid];
  } else {
    const cryptoKey = await subtle.importKey(
      'raw',
      Buffer.from(key),
      {
        name: 'AES-CBC'
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
    name: 'AES-CBC',
    iv
  }, cryptoKey, dataBuffer);

  return Buffer.concat([iv, toBuffer(encrypted)]).toString('base64');
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

export const encryptTask = async (task: Task, cryptoKey: CryptoKey): Promise<EncryptedTask> => {

  const descriptionEncryptPromise = encrypt(task.description, cryptoKey);
  const timesOfDayEncryptPromise = encrypt(task.timesOfDay, cryptoKey);
  const daysOfTheWeekEncryptPromise = encrypt(task.daysOfTheWeek, cryptoKey);

  return {
    description: await descriptionEncryptPromise,
    timesOfDay: await timesOfDayEncryptPromise,
    daysOfTheWeek: await daysOfTheWeekEncryptPromise
  };
};

export const decryptTask = async (encryptedTask: EncryptedTask, cryptoKey: CryptoKey): Promise<Task> => {

  if (encryptedTask) {
    const daysOfTheWeekDecryptPromise = decrypt(encryptedTask.daysOfTheWeek, cryptoKey);
    const timesOfDayDecryptPromise = decrypt(encryptedTask.timesOfDay, cryptoKey);
    const descriptionDecryptPromise = decrypt(encryptedTask.description, cryptoKey);

    let daysOfTheWeek = [];
    try {
      daysOfTheWeek = JSON.parse(await daysOfTheWeekDecryptPromise);
    } catch (e) {
    }

    let timesOfDay = [];
    try {
      timesOfDay = JSON.parse(await timesOfDayDecryptPromise);
    } catch (e) {
    }

    const description = await descriptionDecryptPromise;

    return {
      description,
      daysOfTheWeek,
      timesOfDay,
    };
  } else {
    return {
      description: '',
      daysOfTheWeek: [],
      timesOfDay: [],
    };
  }


};

export const decryptTaskTimesOfDay = async (encryptedTask: EncryptedTask, cryptoKey: CryptoKey): Promise<string[]> => {

  try {
    return JSON.parse(await decrypt(encryptedTask.timesOfDay, cryptoKey));
  } catch (e) {
    return [];
  }
};

export const encryptRound = async (round: Round, cryptoKey: CryptoKey): Promise<EncryptedRound> => {

  const nameEncryptPromise = encrypt(round.name, cryptoKey);
  const taskSizeEncryptPromise = encrypt(round.taskSize, cryptoKey);
  const timesOfDayCardinalityEncryptPromise = encrypt(round.timesOfDayCardinality, cryptoKey);
  const timesOfDayEncryptPromise = round.timesOfDay.map((timeOfDay) => encrypt(timeOfDay, cryptoKey));

  return {
    name: await nameEncryptPromise,
    taskSize: await taskSizeEncryptPromise,
    timesOfDayCardinality: await timesOfDayCardinalityEncryptPromise,
    timesOfDay: await Promise.all(timesOfDayEncryptPromise)
  };
};

export const encryptRoundWithoutName = async (roundWithoutName: RoundWithoutName, cryptoKey: CryptoKey): Promise<EncryptedRoundWithoutName> => {

  const taskSizeEncryptPromise = encrypt(roundWithoutName.taskSize, cryptoKey);
  const timesOfDayCardinalityEncryptPromise = encrypt(roundWithoutName.timesOfDayCardinality, cryptoKey);
  const timesOfDayEncryptPromise = roundWithoutName.timesOfDay.map((timeOfDay) => encrypt(timeOfDay, cryptoKey));

  return {
    taskSize: await taskSizeEncryptPromise,
    timesOfDayCardinality: await timesOfDayCardinalityEncryptPromise,
    timesOfDay: await Promise.all(timesOfDayEncryptPromise)
  };
};

export const encryptRoundWithoutNameAndTaskSize = async (roundWithoutName: RoundWithoutNameAndTaskSize, cryptoKey: CryptoKey): Promise<EncryptedRoundWithoutNameAndTaskSize> => {

  const timesOfDayCardinalityEncryptPromise = encrypt(roundWithoutName.timesOfDayCardinality, cryptoKey);
  const timesOfDayEncryptPromise = roundWithoutName.timesOfDay.map((timeOfDay) => encrypt(timeOfDay, cryptoKey));

  return {
    timesOfDayCardinality: await timesOfDayCardinalityEncryptPromise,
    timesOfDay: await Promise.all(timesOfDayEncryptPromise)
  };
};

// for unit tests
export const decryptRound = async (encryptedRound: EncryptedRound, cryptoKey: CryptoKey): Promise<Round> => {

  const nameDecryptPromise = decrypt(encryptedRound.name, cryptoKey);
  const taskSizeDecryptPromise = decrypt(encryptedRound.taskSize, cryptoKey);
  const timesOfDayCardinalityDecryptPromise = decrypt(encryptedRound.timesOfDayCardinality, cryptoKey);
  const timesOfDayDecryptPromise = encryptedRound.timesOfDay.map((timeOfDay) => decrypt(timeOfDay, cryptoKey))

  let timesOfDayCardinality = [];
  try {
    timesOfDayCardinality = JSON.parse(await timesOfDayCardinalityDecryptPromise);
  } catch (e) {
  }

  return {
    name: await nameDecryptPromise,
    taskSize: +(await taskSizeDecryptPromise || 0),
    timesOfDay: await Promise.all(timesOfDayDecryptPromise),
    timesOfDayCardinality
  };
}

export const decryptRoundName = async (encryptedRound: EncryptedRound, cryptoKey: CryptoKey): Promise<string> => {
  return await decrypt(encryptedRound.name, cryptoKey);
};

export const decryptRoundWithoutName = async (encryptedRound: EncryptedRound, cryptoKey: CryptoKey): Promise<RoundWithoutName> => {

  const taskSizeDecryptPromise = decrypt(encryptedRound.taskSize, cryptoKey);
  const timesOfDayCardinalityDecryptPromise = decrypt(encryptedRound.timesOfDayCardinality, cryptoKey);
  const timesOfDayDecryptPromise = encryptedRound.timesOfDay.map((timeOfDay) => decrypt(timeOfDay, cryptoKey))

  let timesOfDayCardinality = [];
  try {
    timesOfDayCardinality = JSON.parse(await timesOfDayCardinalityDecryptPromise);
  } catch (e) {
  }

  return {
    taskSize: +(await taskSizeDecryptPromise || 0),
    timesOfDay: await Promise.all(timesOfDayDecryptPromise),
    timesOfDayCardinality
  };
};

export const decryptRoundWithoutNameAndTaskSize = async (encryptedRound: EncryptedRound, cryptoKey: CryptoKey): Promise<RoundWithoutNameAndTaskSize> => {

  const timesOfDayCardinalityDecryptPromise = decrypt(encryptedRound.timesOfDayCardinality, cryptoKey);
  const timesOfDayDecryptPromise = encryptedRound.timesOfDay.map((timeOfDay) => decrypt(timeOfDay, cryptoKey))

  let timesOfDayCardinality = [];
  try {
    timesOfDayCardinality = JSON.parse(await timesOfDayCardinalityDecryptPromise);
  } catch (e) {
  }

  return {
    timesOfDay: await Promise.all(timesOfDayDecryptPromise),
    timesOfDayCardinality
  };
};

export const encryptTodayTask = async (todayTask: TodayTask, cryptoKey: CryptoKey): Promise<EncryptedTodayTask> => {

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
    timesOfDay,
  };
};

export const decryptTodayTask = async (encryptedTodayTask: EncryptedTodayTask, cryptoKey: CryptoKey): Promise<TodayTask> => {

  const descriptionDecryptPromise = decrypt(encryptedTodayTask.description, cryptoKey);

  const timesOfDay: { [key in string]: boolean } = {};

  const timeOfDayNamesDecryptPromise = [];
  const encryptedTimeOfDayNames = [];
  for (const encryptedTimeOfDayName of Object.keys(encryptedTodayTask.timesOfDay)) {
    timeOfDayNamesDecryptPromise.push(decrypt(encryptedTimeOfDayName, cryptoKey));
    encryptedTimeOfDayNames.push(encryptedTimeOfDayName);
  }
  const timeOfDayNames = await Promise.all(timeOfDayNamesDecryptPromise);

  for (const [i, timeOfDayName] of timeOfDayNames.entries()) {
    timesOfDay[timeOfDayName] = encryptedTodayTask.timesOfDay[encryptedTimeOfDayNames[i]];
  }

  return {
    description: await descriptionDecryptPromise,
    timesOfDay
  };
};

export const encryptToday = async (today: Today, cryptoKey: CryptoKey): Promise<EncryptedToday> => {

  const nameEncryptPromise = encrypt(today.name, cryptoKey);
  const taskSizeEncryptPromise = encrypt(today.taskSize, cryptoKey);

  return {
    name: await nameEncryptPromise,
    taskSize: await taskSizeEncryptPromise
  };
};

export const decryptToday = async (encryptedToday: EncryptedToday, cryptoKey: CryptoKey): Promise<Today> => {

  const nameDecryptPromise = decrypt(encryptedToday.name, cryptoKey);
  const taskSizeDecryptPromise = await decrypt(encryptedToday.taskSize, cryptoKey);

  return {
    name: await nameDecryptPromise,
    taskSize: +taskSizeDecryptPromise
  };
};
