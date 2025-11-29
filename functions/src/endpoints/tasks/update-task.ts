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
    id: z.string().min(1),
    description: z.string()
      .transform((val) => val.trim().replace(/\s{2,}/g, ' '))
      .refine((val) => val.length >= 1 && val.length <= 256),
    days: z.array(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']))
      .transform((val) => [...new Set(val)])
      .refine((val) => val.length !== 0),
    timesOfDay: z.array(z.string())
      .transform((vals) => vals.map((val) => val.trim().replace(/\s{2,}/g, ' ')))
      .transform((vals) => [...new Set(vals)])
      .refine((vals) => vals.length !== 0)
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

    const userRef = getUserRef(firestore, auth!.uid);
    const userSnap = await transaction.get(userRef);

    const roundRef = getRoundRef(userSnap.ref, data.round.id);
    const roundSnap = await transaction.get(roundRef);
    testRequirement(!roundSnap.exists, {code: 'invalid-argument'});
    const round = roundSnap.data()!;

    const taskRef = getTaskRef(roundSnap.ref, data.task.id);
    const taskSnap = await transaction.get(taskRef);
    testRequirement(!taskSnap.exists, {code: 'invalid-argument'});
    const task = taskSnap.data()!;

    //
    // update round
    // timesOfDay to remove
    // timesOfDay to add
    //

    const newTimesOfDay = [...round.timesOfDay];
    const newTimesOfDayCardinality = [...round.timesOfDayCardinality];

    const timesOfDaysToRemove = task.timesOfDay.filter((timeOfDay) => !data.task.timesOfDay.includes(timeOfDay));
    const timesOfDaysToAdd = data.task.timesOfDay.filter((timeOfDay) => !task.timesOfDay.includes(timeOfDay));

    for (const timeOfDayToRemove of timesOfDaysToRemove) {

      const index = newTimesOfDay.indexOf(timeOfDayToRemove);

      if (newTimesOfDayCardinality[index] === 1) {
        newTimesOfDay.splice(index, 1);
        newTimesOfDayCardinality.splice(index, 1);
      } else {
        newTimesOfDayCardinality[index]--;
      }
    }

    for (const timeOfDayToAdd of timesOfDaysToAdd) {

      const index = newTimesOfDay.indexOf(timeOfDayToAdd);

      if (index === -1) {
        newTimesOfDay.push(timeOfDayToAdd);
        newTimesOfDayCardinality.push(1);
      } else {
        newTimesOfDayCardinality[index]++;
      }
    }

    transactionWrite.set(roundSnap.ref, {
      ...round,
      timesOfDay: newTimesOfDay,
      timesOfDayCardinality: newTimesOfDayCardinality
    });

    //
    // update task
    // set description
    // set days
    // set timesOfDay
    //

    transactionWrite.set(taskSnap.ref, {
      description: data.task.description,
      days: data.task.days,
      timesOfDay: data.task.timesOfDay
    });

    //
    // compute new timesOfDay for todayTask
    // remember previous ones
    // add new ones
    // remove old ones
    //

    //
    // update day docs
    //
    // get the difference between days in the current task and days in a data task
    //
    // if day is removed from a task
    //   remove a todayTask from today
    //     if there is one todayTask for today, remove today
    //     if there are at least two todayTasks for today remove a todayTask id from todayTasksIds
    //
    // if todayTask is added into the today
    //  if there is no task for day, create today and set todayTasksIds to that todayTask and add todayTask
    //
    // update todayTask in the rest of available days if timesOfDay or description were changed
    //

    const removedDays = task.days.filter((day) => !data.task.days.includes(day));
    const addedDays = data.task.days.filter((day) => !task.days.includes(day));

    for (const day of removedDays) {

      const todayRef = getTodayRef(roundSnap.ref, day);
      const todaySnap = await transaction.get(todayRef);
      const today = todaySnap.data()!;

      if (today.todayTasksIds.length === 1) {
        transactionWrite.delete(todaySnap.ref);
      } else {

        const newTodayTasksIds = [...today.todayTasksIds];
        const index = newTodayTasksIds.indexOf(data.task.id);
        newTimesOfDay.splice(index, 1);

        transactionWrite.set(todaySnap.ref, {
          todayTasksIds: newTodayTasksIds
        });
      }

      const todayTaskRef = getTodayTaskRef(todaySnap.ref, data.task.id);
      const todayTaskSnap = await transaction.get(todayTaskRef);

      transactionWrite.delete(todayTaskSnap.ref);
    }

    for (const day of addedDays) {

      const todayRef = getTodayRef(roundSnap.ref, day);
      const todaySnap = await transaction.get(todayRef);
      const today = todaySnap.data();

      const newTodayTasksIds = [...today?.todayTasksIds || [], data.task.id];

      transactionWrite.set(todaySnap.ref, {
        ...today,
        todayTasksIds: newTodayTasksIds
      });

      const todayTaskRef = getTodayTaskRef(todaySnap.ref, data.task.id);
      const todayTaskSnap = await transaction.get(todayTaskRef);

      const newTodayTaskTimesOfDay: {[key in string]: boolean} = {};

      for (const timeOfDay of data.task.timesOfDay) {
        newTodayTaskTimesOfDay[timeOfDay] = false;
      }

      transactionWrite.create(todayTaskSnap.ref, {
        description: data.task.description,
        timesOfDay: newTodayTaskTimesOfDay
      });
    }

    if ([...timesOfDaysToRemove, ...timesOfDaysToAdd].length > 0 || data.task.description !== task.description) {

      // the rest of available days
      const restOfAvailableDays = task.days.filter((day) => !removedDays.includes(day));

      for (const day of restOfAvailableDays) {

        const todayRef = getTodayRef(roundSnap.ref, day);
        const todaySnap = await transaction.get(todayRef);

        const todayTaskRef = getTodayTaskRef(todaySnap.ref, data.task.id);
        const todayTaskSnap = await transaction.get(todayTaskRef);
        const todayTask = todayTaskSnap.data()!;

        const newTodayTaskTimesOfDay = {...todayTask.timesOfDay};

        for (const timeOfDay of timesOfDaysToRemove) {
          delete newTodayTaskTimesOfDay[timeOfDay];
        }

        for (const timeOfDay of timesOfDaysToAdd) {
          newTodayTaskTimesOfDay[timeOfDay] = false;
        }

        transactionWrite.set(todayTaskSnap.ref, {
          description: data.task.description,
          timesOfDay: newTodayTaskTimesOfDay
        });
      }
    }

    await transactionWrite.execute();

    return {
      details: 'Your round has been updated 😉'
    };
  });
};
