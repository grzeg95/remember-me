import * as CryptoJS from 'crypto-js';
import {EncryptedToday, Today} from '../../functions/src/helpers/models';
import {EncryptedRound, EncryptedTask, EncryptedTodayTask, Round, TodayTask, Task} from './user/models';

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

export const decryptTodayTask = (encryptedTodayTask: EncryptedTodayTask, symmetricKey: string): TodayTask => {

  const timesOfDay: { [k in string]: boolean } = {};
  for (const encryptedTimeOfDayName of Object.keys(encryptedTodayTask.timesOfDay)) {
    timesOfDay[decrypt(encryptedTimeOfDayName, symmetricKey)] = encryptedTodayTask.timesOfDay[encryptedTimeOfDayName];
  }

  return {
    timesOfDayEncryptedMap: undefined,
    description: decrypt(encryptedTodayTask.description, symmetricKey),
    timesOfDay
  };
};

export const decryptToday = (encryptedToday: EncryptedToday, symmetricKey: string): Today => {
  return {
    name: decrypt(encryptedToday.name, symmetricKey),
    taskSize: +decrypt(encryptedToday.taskSize, symmetricKey)
  };
};
