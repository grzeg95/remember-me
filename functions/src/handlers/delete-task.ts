import {firestore} from 'firebase-admin';
import {CallableContext} from 'firebase-functions/lib/providers/https';
import {Task} from '../helpers/models';
import {testRequirement} from '../helpers/test-requirement';
import {numberToDayArray} from '../helpers/times-of-days';
import {getUser, writeUser} from '../helpers/user';

const app = firestore();

/**
 * Read user data about task and remove it
 * @param taskId any
 * @param context CallableContext
 * @return Promise<{[key: string]: string}>
 **/
export const handler = (taskId: any, context: CallableContext): Promise<{[key: string]: string}> => {

  // not logged in
  testRequirement(!context.auth);

  // taskId is not string
  testRequirement(!taskId || typeof taskId !== 'string');

  const auth: { uid: string } | undefined = context.auth;

  return app.runTransaction(async (transaction) => {

    const userDocSnap = await getUser(app, transaction, auth?.uid as string);
    const taskDocSnap = await transaction.get(userDocSnap.ref.collection('task').doc(taskId));

    // interrupt if user has not this task
    testRequirement(!taskDocSnap.exists);

    /*
    * Read all data
    * */

    const task: Task = taskDocSnap.data() as Task;
    const userDocSnapData = userDocSnap.data();
    const currentTaskSize = userDocSnapData?.taskSize;
    const timesOfDay: string[] = userDocSnapData?.timesOfDay || [];
    const timesOfDayCardinality: number[] = userDocSnapData?.timesOfDayCardinality || [];

    // read all task for user/{userId}/today/{day}/task/{taskId}
    const todayTaskDocSnapsToUpdatePromises = [];

    for (const day of numberToDayArray(task.daysOfTheWeek)) {
      todayTaskDocSnapsToUpdatePromises.push(
        transaction.get(userDocSnap.ref.collection('today').doc(`${day}/task/${taskDocSnap.id}`))
      );
    }

    const todayTasksPromise = Promise.all(todayTaskDocSnapsToUpdatePromises);

    // prepare timesOfDay and timesOfDayCardinality
    for (const timeOfDay of task.timesOfDay) {
      const indexToRemove = timesOfDay.indexOf(timeOfDay);
      if (indexToRemove > -1) {
        if (timesOfDayCardinality[indexToRemove] - 1 === 0) {
          timesOfDayCardinality.splice(indexToRemove, 1);
          timesOfDay.splice(indexToRemove, 1);
        } else {
          timesOfDayCardinality[indexToRemove]--;
        }
      }
    }

    // wait for rest

    const todayTasks = await todayTasksPromise;

    /*
    * Proceed all data
    * */

    // remove task
    transaction.delete(taskDocSnap.ref);

    // remove todayTasks
    for (const todayTaskDocSnap of todayTasks) {
      transaction.delete(todayTaskDocSnap.ref)
    }

    // update user
    const userDataToWrite = {
      timesOfDayCardinality,
      taskSize: currentTaskSize - 1,
      timesOfDay
    };
    writeUser(transaction, userDocSnap, userDataToWrite);

    return transaction;

  }).then(() => ({
    details: 'Your task has been deleted 🤭'
  }));
};
