import * as CryptoJS from 'crypto-js';

export const decryptTask = (task: any, privateKey: string): any => {

  let daysOfTheWeek = [];
  try {
    daysOfTheWeek = JSON.parse(CryptoJS.AES.decrypt(task.daysOfTheWeek, privateKey).toString(CryptoJS.enc.Utf8))
  } catch (e) {}

  let timesOfDay = [];
  try {
    timesOfDay = JSON.parse(CryptoJS.AES.decrypt(task.timesOfDay, privateKey).toString(CryptoJS.enc.Utf8))
  } catch (e) {}

  return {
    description: task.description ? CryptoJS.AES.decrypt(task.description, privateKey).toString(CryptoJS.enc.Utf8) : 'lol',
    daysOfTheWeek,
    timesOfDay,
  };
}
