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
import * as CryptoJS from 'crypto-js';

export const decryptSymmetricKey = async (encryptedSymmetricKey: string): Promise<string> => {

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

  return (decryptResponse.plaintext || '').toString();
};

export const encrypt = (data: any, symmetricKey: string): string => {

  let dataString = '';

  if (typeof data === 'string') {
    dataString = data;
  } else {
    dataString = JSON.stringify(data);
  }

  return CryptoJS.AES.encrypt(dataString, symmetricKey).toString();
};

export const decrypt = (data: string, symmetricKey: string): string => {
  return CryptoJS.AES.decrypt(data, symmetricKey).toString(CryptoJS.enc.Utf8);
};

export const encryptTask = (task: Task, symmetricKey: string): EncryptedTask => {
  return {
    description: encrypt(task.description, symmetricKey),
    timesOfDay: encrypt(task.timesOfDay, symmetricKey),
    daysOfTheWeek: encrypt(task.daysOfTheWeek, symmetricKey)
  };
};

export const decryptTask = (encryptedTask: EncryptedTask, symmetricKey: string): Task => {

  let daysOfTheWeek = [];
  try {
    daysOfTheWeek = JSON.parse(decrypt(encryptedTask.daysOfTheWeek, symmetricKey));
  } catch (e) {
  }

  let timesOfDay = [];
  try {
    timesOfDay = JSON.parse(decrypt(encryptedTask.timesOfDay, symmetricKey));
  } catch (e) {
  }

  let description = '';

  try {
    description = decrypt(encryptedTask.description, symmetricKey);
  } catch (e) {
  }

  return {
    description,
    daysOfTheWeek,
    timesOfDay,
  };
};

export const decryptTaskTimesOfDay = (encryptedTask: EncryptedTask, symmetricKey: string): string[] => {

  try {
    return JSON.parse(decrypt(encryptedTask.timesOfDay, symmetricKey));
  } catch (e) {
    return [];
  }
};

export const encryptRound = (round: Round, symmetricKey: string): EncryptedRound => {
  return {
    name: encrypt(round.name, symmetricKey),
    taskSize: encrypt(round.taskSize, symmetricKey),
    timesOfDayCardinality: encrypt(round.timesOfDayCardinality, symmetricKey),
    timesOfDay: round.timesOfDay.map((timeOfDay) => encrypt(timeOfDay, symmetricKey))
  };
};

export const encryptRoundWithoutName = (roundWithoutName: RoundWithoutName, symmetricKey: string): EncryptedRoundWithoutName => {
  return {
    taskSize: encrypt(roundWithoutName.taskSize, symmetricKey),
    timesOfDayCardinality: encrypt(roundWithoutName.timesOfDayCardinality, symmetricKey),
    timesOfDay: roundWithoutName.timesOfDay.map((timeOfDay) => encrypt(timeOfDay, symmetricKey))
  };
};

export const encryptRoundWithoutNameAndTaskSize = (roundWithoutName: RoundWithoutNameAndTaskSize, symmetricKey: string): EncryptedRoundWithoutNameAndTaskSize => {
  return {
    timesOfDayCardinality: encrypt(roundWithoutName.timesOfDayCardinality, symmetricKey),
    timesOfDay: roundWithoutName.timesOfDay.map((timeOfDay) => encrypt(timeOfDay, symmetricKey))
  };
};

// for unit tests
export const decryptRound = (encryptedRound: EncryptedRound, symmetricKey: string): Round => {

  let timesOfDayCardinality = [];
  try {
    timesOfDayCardinality = JSON.parse(decrypt(encryptedRound.timesOfDayCardinality, symmetricKey))
  } catch (e) {}

  return {
    name: decrypt(encryptedRound.name, symmetricKey),
    taskSize: +(decrypt(encryptedRound.taskSize, symmetricKey) || 0),
    timesOfDay: encryptedRound.timesOfDay.map((timeOfDay) => decrypt(timeOfDay, symmetricKey)),
    timesOfDayCardinality
  };
}

export const decryptRoundName = (encryptedRound: EncryptedRound, symmetricKey: string): string => {
  return decrypt(encryptedRound.name, symmetricKey);
};

export const decryptRoundWithoutName = (encryptedRound: EncryptedRound, symmetricKey: string): RoundWithoutName => {

  let timesOfDayCardinality = [];
  try {
    timesOfDayCardinality = JSON.parse(decrypt(encryptedRound.timesOfDayCardinality, symmetricKey));
  } catch (e) {
  }

  return {
    taskSize: +(decrypt(encryptedRound.taskSize, symmetricKey) || 0),
    timesOfDay: encryptedRound.timesOfDay.map((timeOfDay) => decrypt(timeOfDay, symmetricKey)),
    timesOfDayCardinality
  };
};

export const decryptRoundWithoutNameAndTaskSize = (encryptedRound: EncryptedRound, symmetricKey: string): RoundWithoutNameAndTaskSize => {

  let timesOfDayCardinality = [];
  try {
    timesOfDayCardinality = JSON.parse(decrypt(encryptedRound.timesOfDayCardinality, symmetricKey));
  } catch (e) {
  }

  return {
    timesOfDay: encryptedRound.timesOfDay.map((timeOfDay) => decrypt(timeOfDay, symmetricKey)),
    timesOfDayCardinality
  };
};

export const encryptTodayTask = (todayTask: TodayTask, symmetricKey: string): EncryptedTodayTask => {

  const timesOfDay: { [k in string]: boolean } = {};
  for (const timeOfDay of Object.keys(todayTask.timesOfDay)) {
    timesOfDay[encrypt(timeOfDay, symmetricKey)] = todayTask.timesOfDay[timeOfDay];
  }

  return {
    description: encrypt(todayTask.description, symmetricKey),
    timesOfDay,
  };
};

export const decryptTodayTask = (encryptedTodayTask: EncryptedTodayTask, symmetricKey: string): TodayTask => {

  const timesOfDay: { [k in string]: boolean } = {};
  for (const encryptedTimeOfDayName of Object.keys(encryptedTodayTask.timesOfDay)) {
    timesOfDay[decrypt(encryptedTimeOfDayName, symmetricKey)] = encryptedTodayTask.timesOfDay[encryptedTimeOfDayName];
  }

  return {
    description: decrypt(encryptedTodayTask.description, symmetricKey),
    timesOfDay,
  };
};

export const encryptToday = (today: Today, symmetricKey: string): EncryptedToday => {
  return {
    name: encrypt(today.name, symmetricKey),
    taskSize: encrypt(today.taskSize, symmetricKey)
  };
};

export const decryptToday = (encryptedToday: EncryptedToday, symmetricKey: string): Today => {
  return {
    name: decrypt(encryptedToday.name, symmetricKey),
    taskSize: +decrypt(encryptedToday.taskSize, symmetricKey)
  };
};
