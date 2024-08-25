import {DocumentSnapshot, getFirestore} from 'firebase-admin/firestore';
import {CallableRequest} from 'firebase-functions/v2/https';
import {Round} from '../../models/round';
import {Today} from '../../models/today';
import {TodayTask} from '../../models/today-task';
import {User} from '../../models/user';
import {testRequirement} from '../../utils/test-requirement';
import {TransactionWrite} from '../../utils/transaction-write';

const firestore = getFirestore();

export const handler = async (request: CallableRequest) => {

  const auth = request.auth;
  const data = request.data;

  // without app check
  // not logged in
  // email not verified, not for anonymous
  testRequirement(!auth || (!auth?.token.email_verified &&
    auth?.token.provider_id !== 'anonymous' &&
    !auth?.token.isAnonymous) || !auth?.token.secretKey, {code: 'permission-denied'});

  // data is not an object or is null
  testRequirement(typeof data !== 'object' || data === null);

  const dataKeys = Object.keys(data);

  // data has not 2 keys
  testRequirement(dataKeys.length !== 2);

  // data has not 'roundId', 'todayId'
  testRequirement(!dataKeys.toSet().hasOnly(['roundId', 'todayId'].toSet()));

  // data.roundId is not empty string
  testRequirement(typeof data.roundId !== 'string' || data.roundId.length === 0);

  // data.todayId is not empty string
  testRequirement(typeof data.todayId !== 'string' || data.todayId.length === 0);

  return firestore.runTransaction(async (transaction) => {

    const transactionWrite = new TransactionWrite(transaction);

    const roundId = data.roundId;
    const todayId = data.todayId;

    const userRef = User.ref(firestore, auth!.uid);
    const roundRef = Round.ref(userRef, roundId);
    const todayRef = Today.ref(roundRef, todayId);
    const todayTasksRefs = TodayTask.refs(todayRef);

    const todayTasksSnapsPromise: Promise<DocumentSnapshot<TodayTask>>[] = [];
    const todayTasksRefsArray = await todayTasksRefs.listDocuments();

    for (const todayTasksRef of todayTasksRefsArray) {
      todayTasksSnapsPromise.push(transaction.get(todayTasksRef));
    }

    const todayTasksSnaps = await Promise.all(todayTasksSnapsPromise);

    for (const todayTasksSnap of todayTasksSnaps) {

      const timesOfDay: {[p: string]: boolean} = {};

      for (const timesOfDayKey of Object.getOwnPropertyNames(todayTasksSnap.data()?.timesOfDay)) {
        timesOfDay[timesOfDayKey] = false;
      }

      transactionWrite.update(todayTasksSnap.ref, {
        timesOfDay
      } as TodayTask);
    }

    return transactionWrite.execute();
  }).then(() => ({
    code: 200,
    body: {
      details: 'Today tasks has been untouched 🙈'
    }
  }));
};
