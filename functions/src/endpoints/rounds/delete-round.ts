import {getFirestore} from 'firebase-admin/firestore';
import {CallableRequest} from 'firebase-functions/v2/https';
import {z} from 'zod';
import {Day} from '../../models/Day';
import {getRoundRef} from '../../models/Round';
import {getTaskRef} from '../../models/Task';
import {getTodayRef} from '../../models/Today';
import {getTodayTaskRef} from '../../models/TodayTask';
import {getUserRef} from '../../models/User';
import {testRequirement} from '../../utils/test-requirement';
import {TransactionWrite} from '../../utils/transaction-write';

const firestore = getFirestore();

const dataSchema = z.object({
  round: z.object({
    id: z.string()
  })
});

export const handler = async (request: CallableRequest) => {

  const auth = request.auth;

  testRequirement(!auth, {code: 'permission-denied'});

  const dataSchemaValidationResult = dataSchema.safeParse(request.data);
  testRequirement(!!dataSchemaValidationResult.error, {code: 'invalid-argument'});
  const data = dataSchemaValidationResult.data!;

  return firestore.runTransaction(async (transaction) => {

    const transactionWrite = new TransactionWrite(transaction);

    const userRef= getUserRef(firestore, auth!.uid);
    const userSnap = await transaction.get(userRef);
    const user = userSnap.data();

    const roundsIds = (user?.roundsIds || []).filter((roundId) => roundId !== data.round.id);

    transactionWrite.set(userSnap.ref, {
      ...user,
      roundsIds
    });

    const roundRef = getRoundRef(userRef, data.round.id);
    const roundSnap = await transaction.get(roundRef);
    testRequirement(!roundSnap.exists, {code: 'invalid-argument'});
    const round = roundSnap.data()!;
    transactionWrite.delete(roundSnap.ref);

    // get and delete tasks/taskId
    // store days for later deletion
    const usedDays = new Set<Day>();

    for (const taskId of round.tasksIds) {

      const taskRef = getTaskRef(roundSnap.ref, taskId);
      const taskSnap = await transaction.get(taskRef);
      testRequirement(!taskSnap.exists, {code: 'invalid-argument'});
      const task = await taskSnap.data()!;

      for (const day of task.days) {
        usedDays.add(day as Day);
      }

      transactionWrite.delete(taskSnap.ref);
    }

    // get and delete todays/[mon...sun]

    for (const day of [...usedDays]) {

      const todayRef = getTodayRef(roundSnap.ref, day);
      const todaySnap = await transaction.get(todayRef);
      testRequirement(!todaySnap.exists, {code: 'invalid-argument'});
      const today = todaySnap.data()!;

      transactionWrite.delete(todaySnap.ref);

      // get and delete /todays/[mon...sun]/todaysTasks/todayTaskId

      for (const todayTaskId of today.todayTasksIds) {

        const todayTask = getTodayTaskRef(todaySnap.ref, todayTaskId);
        const todayTaskSnap = await transaction.get(todayTask);
        testRequirement(!todayTaskSnap.exists, {code: 'invalid-argument'});
        transactionWrite.delete(todayTaskSnap.ref);
      }
    }

    await transactionWrite.execute();

    return {
      details: 'Your round has been deleted 😉'
    };
  });
};
