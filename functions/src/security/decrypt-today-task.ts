import * as CryptoJS from 'crypto-js';

export const decryptTodayTask = (todayTask: any, privateKey: string): any => {

  let timesOfDay = [];
  try {
    timesOfDay = JSON.parse(CryptoJS.AES.decrypt(todayTask.timesOfDay, privateKey).toString(CryptoJS.enc.Utf8))
  } catch (e) {}

  return {
    description: todayTask.description ? CryptoJS.AES.decrypt(todayTask.description, privateKey).toString(CryptoJS.enc.Utf8) : 'lol',
    timesOfDay,
  };
}
