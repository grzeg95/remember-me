import {firestore} from 'firebase-admin';
import {CallableContext} from 'firebase-functions/lib/providers/https';
import {EncryptedRound} from '../../helpers/models';
import {testRequirement} from '../../helpers/test-requirement';
import {getUser} from '../../helpers/user';
import {decryptRound, decryptRsaKey, encryptRound, RsaKey} from '../../security/security';

const app = firestore();

/**
 * @function handler
 * Set times of day order
 * @param data {
 *     roundId: string;
 *     timeOfDay: string;
 *     moveBy: number
 * }
 * @param context CallableContext
 * @return Promise<{ [key: string]: string }>
 **/
export const handler = async (data: any, context: CallableContext) => {

  // without app check
  testRequirement(!context.app);

  // not logged in
  testRequirement(!context.auth);

  // data is not an object or is null
  testRequirement(typeof data !== 'object' || data === null);

  const dataKeys = Object.keys(data);

  // data has not 3 keys
  testRequirement(dataKeys.length !== 3);

  // data has not 'task', 'taskId', 'roundId'
  testRequirement(!dataKeys.toSet().hasOnly(['moveBy', 'timeOfDay', 'roundId'].toSet()));

  // data.roundId is not empty string
  testRequirement(typeof data.roundId !== 'string' || data.roundId.length === 0);

  // data.timeOfDay is not empty string
  testRequirement(typeof data.timeOfDay !== 'string' || data.timeOfDay.length === 0);

  // data.moveBy is integer without 0
  testRequirement(!Number.isInteger(data.moveBy) || data.moveBy === 0);

  const auth: { uid: string } | undefined = context.auth;

  return app.runTransaction(async (transaction) => {

    const timeOfDay = data.timeOfDay;
    const roundId = data.roundId;
    const moveBy = data.moveBy;
    const userDocSnap = await getUser(app, transaction, auth?.uid as string);
    const roundDocSnap = await transaction.get(userDocSnap.ref.collection('rounds').doc(roundId));

    // check if timeOfDay exists
    testRequirement(!roundDocSnap.exists);

    // get rsa key
    // TODO
    let rsaKey: RsaKey;
    if (context.auth?.token.decryptedRsaKey) {
      rsaKey = context.auth?.token.decryptedRsaKey;
    } else {
      rsaKey = await decryptRsaKey(context.auth?.token.encryptedRsaKey);
    }

    const timesOfDayDocSnapData = decryptRound(roundDocSnap.data() as EncryptedRound, rsaKey);
    const timesOfDay = timesOfDayDocSnapData.timesOfDay;
    const timesOfDayCardinality = timesOfDayDocSnapData.timesOfDayCardinality;
    const toMoveIndex = timesOfDay.indexOf(timeOfDay);

    testRequirement(toMoveIndex === -1);
    testRequirement(moveBy > 0 && toMoveIndex + moveBy >= timesOfDay.length);
    testRequirement(moveBy < 0 && toMoveIndex + moveBy < 0);

    timesOfDay.move(toMoveIndex, toMoveIndex + moveBy);
    timesOfDayCardinality.move(toMoveIndex, toMoveIndex + moveBy);

    // update user
    const timesOfDayDataToWrite = encryptRound({
      name: timesOfDayDocSnapData.name,
      taskSize: timesOfDayDocSnapData.taskSize,
      timesOfDay,
      timesOfDayCardinality
    }, rsaKey);

    transaction.update(roundDocSnap.ref, timesOfDayDataToWrite);

    return transaction;

  }).then(() => ({
    details: 'Order has been updated 🙃'
  }));

};
