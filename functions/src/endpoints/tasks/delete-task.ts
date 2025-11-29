import {getFirestore} from 'firebase-admin/firestore';
import {CallableRequest} from 'firebase-functions/v2/https';
import {z} from 'zod';
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
    id: z.string().min(1)
  }),
  task: z.object({
    id: z.string().min(1)
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

    const roundRef = getRoundRef(userSnap.ref, data.round.id);
    const roundSnap = await transaction.get(roundRef);
    testRequirement(!roundSnap.exists, {code: 'invalid-argument'});
    const round = roundSnap.data()!;

    const newTasksIds = round.tasksIds.filter((taskId) => taskId !== data.task.id);

    const taskRef = getTaskRef(roundSnap.ref, data.task.id);
    const taskSnap = await transaction.get(taskRef);
    testRequirement(!taskSnap.exists, {code: 'invalid-argument'});
    const task = taskSnap.data()!;

    transactionWrite.delete(taskSnap.ref);

    const newTimesOfDay = [...round.timesOfDay];
    const newTimesOfDayCardinality = [...round.timesOfDayCardinality];

    const timesOfDaysToRemove = task.timesOfDay;

    for (const timeOfDayToRemove of timesOfDaysToRemove) {

      const index = newTimesOfDay.indexOf(timeOfDayToRemove);

      if (newTimesOfDayCardinality[index] === 1) {
        newTimesOfDay.splice(index, 1);
        newTimesOfDayCardinality.splice(index, 1);
      } else {
        newTimesOfDayCardinality[index]--;
      }
    }

    transactionWrite.set(roundSnap.ref, {
      ...round,
      tasksIds: newTasksIds,
      timesOfDay: newTimesOfDay,
      timesOfDayCardinality: newTimesOfDayCardinality
    });

    for (const day of task.days) {

      const todayRef = getTodayRef(roundSnap.ref, day);
      const todaySnap = await transaction.get(todayRef);
      testRequirement(!todaySnap.exists, {code: 'invalid-argument'});
      const today = todaySnap.data()!;

      // delete only if there are no other tasks for today

      if (today.todayTasksIds.length === 1) {
        transactionWrite.delete(todaySnap.ref);
      } else {
        transactionWrite.set(todaySnap.ref, {
          ...today,
          todayTasksIds: today.todayTasksIds.filter((todayTaskId) => todayTaskId !== data.task.id)
        });
      }

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
      details: 'Your task has been deleted 😉'
    };
  });
};
