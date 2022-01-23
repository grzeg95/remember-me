import * as CryptoJS from 'crypto-js';

export const decryptRound = (round: any, privateKey: string): any => {

  let timesOfDay = [];
  try {
    timesOfDay = JSON.parse(CryptoJS.AES.decrypt(round.timesOfDay, privateKey).toString(CryptoJS.enc.Utf8))
  } catch (e) {}

  let timesOfDayCardinality = [];
  try {
    timesOfDayCardinality = JSON.parse(CryptoJS.AES.decrypt(round.timesOfDayCardinality, privateKey).toString(CryptoJS.enc.Utf8))
  } catch (e) {}

  return {
    taskSize: +(CryptoJS.AES.decrypt(round.taskSize, privateKey) || 0),
    timesOfDay,
    timesOfDayCardinality,
  };
}
