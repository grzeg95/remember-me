import * as CryptoJS from 'crypto-js';
import {EncryptedRound, EncryptedTask, EncryptedTodayTask, Round, TodayTask, Task} from './user/models';

export const encrypt = (data: any, privateKey: string): string => {

  let dataString = '';

  try {
    dataString = JSON.stringify(data);
  } catch (e) {
    dataString = e + '';
  }

  return CryptoJS.AES.encrypt(dataString, privateKey).toString();
}

export const decrypt = (data: string, privateKey: string): string => {
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
  console.log(timesOfDay);

  let description = '';
  try {
    description = CryptoJS.AES.decrypt(encryptedTask.description, privateKey).toString(CryptoJS.enc.Utf8);
    console.log(description);
    description = description.substring(1, description.length-1);
  } catch (e) {}

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
  name = name.substring(1, name.length-1);

  return {
    name,
    taskSize: +(decrypt(encryptedRound.taskSize, privateKey) || 0),
    timesOfDay: encryptedRound.timesOfDay.map((timeOfDay) => {
      const decryptedTimeOfDay = decrypt(timeOfDay, privateKey);
      return decryptedTimeOfDay.substring(1, decryptedTimeOfDay.length-1)
    }),
    timesOfDayCardinality
  };
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
  const timesOfDayEncryptedMap: {[key in string]: string} = {};
  for (const encryptedTimeOfDayName of Object.keys(encryptedTodayTask.timesOfDay)) {
    let name = decrypt(encryptedTimeOfDayName, privateKey);
    console.log(name);
    name = name.substring(1, name.length-1);
    timesOfDay[name] = encryptedTodayTask.timesOfDay[encryptedTimeOfDayName];
    timesOfDayEncryptedMap[name] = encryptedTimeOfDayName;
  }

  let description = CryptoJS.AES.decrypt(encryptedTodayTask.description, privateKey).toString(CryptoJS.enc.Utf8)

  return {
    description,
    timesOfDay,
    timesOfDayEncryptedMap
  };
}
