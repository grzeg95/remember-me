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

    const userRef= getUserRef(firestore, auth!.uid);
    const userSnap = await transaction.get(userRef);

    const roundRef = getRoundRef(userSnap.ref, data.round.id);
    const roundSnap = await transaction.get(roundRef);
    testRequirement(!roundSnap.exists, {code: 'invalid-argument'});
    const round = roundSnap.data()!;

    testRequirement(round.tasksIds.length === 25, {message: 'You can own up tp 25 tasks'});

    //
    // update round
    //
    // while removing or updating tasks we must have cardinality of timesOfDays to determinate removing it from round
    //

    const newTimeOfDayNames: string[] = [...round.timesOfDay];
    const newTimeOfDayNamesCardinality: number[] = [...round.timesOfDayCardinality];

    // increment to current
    for (let i = 0; i < newTimeOfDayNames.length; i++) {

      const index = data.task.timesOfDay.indexOf(round.timesOfDay[i]);

      if (index > -1) {
        newTimeOfDayNamesCardinality[i]++;
      }
    }

    // add new
    const toAdd: string[] = data.task.timesOfDay.filter((timesOfDayName) => !round.timesOfDay.includes(timesOfDayName));

    for (const timeOfDay of toAdd) {
      newTimeOfDayNames.push(timeOfDay);
      newTimeOfDayNamesCardinality.push(1);
    }

    //
    // update round
    // exit

    testRequirement(newTimeOfDayNames.length > 10, {message: `You can own 10 times of day but merge had ${newTimeOfDayNames.length} 🤔`});

    // create /tasks/taskId

    const newTodayTaskTimesOfDay: { [key in string]: boolean } = {};

    for (const timeOfDay of data.task.timesOfDay) {
      newTodayTaskTimesOfDay[timeOfDay] = false;
    }

    const taskRef = getTaskRef(roundSnap.ref);
    const taskSnap = await transaction.get(taskRef);
    testRequirement(taskSnap.exists, {code: 'invalid-argument'});
    transactionWrite.create(taskSnap.ref, {
      description: data.task.description,
      days: data.task.days,
      timesOfDay: data.task.timesOfDay
    });

    // create todays/[mon...sun]

    for (const day of data.task.days) {

      const todayRef = getTodayRef(roundSnap.ref, day);
      const todaySnap = await transaction.get(todayRef);
      const today = todaySnap.data();

      const newTodayTasksIds = (today?.todayTasksIds || []);
      newTodayTasksIds.push(taskSnap.id);

      transactionWrite.set(todaySnap.ref, {
        ...today,
        todayTasksIds: newTodayTasksIds
      });

      // create todays/[mon...sun]/todayTask/todayTaskId

      const todayTaskRef = getTodayTaskRef(todaySnap.ref, taskSnap.id);
      const todayTaskSnap = await transaction.get(todayTaskRef);

      transactionWrite.create(todayTaskSnap.ref, {
        description: data.task.description,
        timesOfDay: newTodayTaskTimesOfDay
      });
    }

    transactionWrite.set(roundSnap.ref, {
      ...round,
      timesOfDay: newTimeOfDayNames,
      timesOfDayCardinality: newTimeOfDayNamesCardinality,
      tasksIds: [...round.tasksIds, taskSnap.id]
    });

    await transactionWrite.execute();

    return {
      details: 'Your round has been created 😉',
      taskId: taskSnap.id
    };
  });
};
