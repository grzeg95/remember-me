import * as CryptoJS from 'crypto-js';
import {cryptoKeyVersionPath, keyManagementServiceClient} from '../config';
import {
  EncryptedRound,
  EncryptedTask,
  EncryptedToday,
  EncryptedTodayTask,
  Round,
  Task,
  Today,
  TodayTask
} from '../helpers/models';
import {testRequirement} from '../helpers/test-requirement';
const crc32c = require('fast-crc32c');

export const decryptPrivateKey = async (encryptedPrivateKey: string): Promise<string> => {

  // @ts-ignore
  const ciphertext = new Uint8Array(encryptedPrivateKey.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

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

  const privateKey = (decryptResponse.plaintext || '').toString()
  testRequirement(privateKey.length === 0);

  return privateKey;
}

export const encrypt = (data: any, privateKey: string): string => {

  let dataString = '';

  try {
    dataString = JSON.stringify(data);
  } catch (e) {
    dataString = e + '';
  }

  // console.log(CryptoJS.AES.encrypt(dataString, privateKey).toString());
  return CryptoJS.AES.encrypt(dataString, privateKey).toString();
}

export const decrypt = (data: string, privateKey: string): string => {
  // console.log(CryptoJS.AES.decrypt(data, privateKey).toString(CryptoJS.enc.Utf8));
  return CryptoJS.AES.decrypt(data, privateKey).toString(CryptoJS.enc.Utf8);
}

export const encryptTask = (task: Task, privateKey: string): EncryptedTask => {
  return {
    description: encrypt(task.description, privateKey),
    timesOfDay: encrypt(task.timesOfDay, privateKey),
    daysOfTheWeek: encrypt(task.daysOfTheWeek, privateKey)
  };
}

export const decryptTask = (encryptedTask: EncryptedTask, privateKey: string): Task => {

  let daysOfTheWeek = [];
  try {
    daysOfTheWeek = JSON.parse(CryptoJS.AES.decrypt(encryptedTask.daysOfTheWeek, privateKey).toString(CryptoJS.enc.Utf8))
  } catch (e) {}

  let timesOfDay = [];
  try {
    timesOfDay = JSON.parse(CryptoJS.AES.decrypt(encryptedTask.timesOfDay, privateKey).toString(CryptoJS.enc.Utf8))
  } catch (e) {}

  let description = '';

  try {
    description = decrypt(encryptedTask.description, privateKey);
    description = description.substr(1, description.length-2);
  } catch (e) {}

  // console.log({description});

  return {
    description,
    daysOfTheWeek,
    timesOfDay,
  };
}

export const encryptRound = (round: Round, privateKey: string): EncryptedRound => {
  return {
    name: encrypt(round.name, privateKey),
    taskSize: encrypt(round.taskSize, privateKey),
    timesOfDayCardinality: encrypt(round.timesOfDayCardinality, privateKey),
    timesOfDay: round.timesOfDay.map((timeOfDay) => encrypt(timeOfDay, privateKey))
  };
}

export const decryptRound = (encryptedRound: EncryptedRound, privateKey: string): Round => {

  let timesOfDayCardinality = [];
  try {
    timesOfDayCardinality = JSON.parse(CryptoJS.AES.decrypt(encryptedRound.timesOfDayCardinality, privateKey).toString(CryptoJS.enc.Utf8))
  } catch (e) {}

  let name = decrypt(encryptedRound.name, privateKey);
  name = name.substr(1, name.length-2);

  const round = {
    name,
    taskSize: +(decrypt(encryptedRound.taskSize, privateKey) || 0),
    timesOfDay: encryptedRound.timesOfDay.map((timeOfDay) => {
      let timeOfDayDecrypted = decrypt(timeOfDay, privateKey);
      return timeOfDayDecrypted.substr(1, timeOfDayDecrypted.length-2);
    }),
    timesOfDayCardinality
  };

  return round;
}

export const encryptTodayTask = (todayTask: TodayTask, privateKey: string): EncryptedTodayTask => {

  const timesOfDay: {[key in string]: boolean} = {};
  for (const timeOfDay of Object.keys(todayTask.timesOfDay)) {
    timesOfDay[encrypt(timeOfDay, privateKey)] = todayTask.timesOfDay[timeOfDay];
  }

  return {
    description: CryptoJS.AES.encrypt(todayTask.description, privateKey).toString(),
    timesOfDay,
  };
}

export const decryptTodayTask = (encryptedTodayTask: EncryptedTodayTask, privateKey: string): TodayTask => {

  const timesOfDay: {[key in string]: boolean} = {};
  for (const encryptedTimeOfDayName of Object.keys(encryptedTodayTask.timesOfDay)) {
    timesOfDay[decrypt(encryptedTimeOfDayName, privateKey)] = encryptedTodayTask.timesOfDay[encryptedTimeOfDayName];
  }

  return {
    description: decrypt(encryptedTodayTask.description, privateKey),
    timesOfDay,
  };
}

export const hexToString = (hex: string): string => {
  return ((hex || '').match(/.{1,2}/g) || []).map((a) => String.fromCharCode(parseInt(a, 16))).join('');
}

export const encryptToday = (today: Today, privateKey: string): EncryptedToday => {
  return {
    name: encrypt(today.name, privateKey),
    taskSize: encrypt(today.taskSize, privateKey)
  };
}

export const decryptToday = (encryptedToday: EncryptedToday, privateKey: string): Today => {

  let name = decrypt(encryptedToday.name, privateKey);
  name = name.substr(1, name.length - 2);

  return {
    name,
    taskSize: +decrypt(encryptedToday.taskSize, privateKey)
  };
}
