import {firestore} from 'firebase-admin';
import {CallableContext, HttpsError} from 'firebase-functions/lib/providers/https';
import {Task} from '../helpers/models';
import {testRequirement} from '../helpers/test-requirement';
import {numberToDayArray} from '../helpers/times-of-days';
import {getUser} from '../helpers/user';
import DocumentSnapshot = firestore.DocumentSnapshot;

const app = firestore();

/**
 * Read user data about task and remove it
 * @param data {taskId: any}
 * @param context CallableContext
 * @return Promise<{[key: string]: string}>
 **/
export const handler = (data: any, context: CallableContext): Promise<{[key: string]: string}> => {

  // not logged in
  testRequirement(!context.auth, 'Please login in');

  // data has not taskId
  testRequirement(!data.taskId);

  // data.taskId is not string
  testRequirement(typeof data.taskId !== 'string');

  const auth: { uid: string } | undefined = context.auth;

  return app.runTransaction(async (transaction) => {

    const userDocSnap = await getUser(app, transaction, auth?.uid as string);
    const taskDocSnap = await transaction.get(userDocSnap.ref.collection('task').doc(data.taskId)).then((docSnap) => docSnap);

    // interrupt if user has not this task
    if (!taskDocSnap.exists) {
      throw new HttpsError(
        'invalid-argument',
        `Task does not exist: ${taskDocSnap.ref.path}`,
        `Some went wrong 🤫 Try again 🙂`
      );
    }

    /*
    * Read all data
    * */

    const task: Task = taskDocSnap.data() as Task;
    const currentTaskSize = userDocSnap.data()?.taskSize;
    const timesOfDay: string[] = userDocSnap.data()?.timesOfDay || [];
    const timesOfDayCardinality: number[] = userDocSnap.data()?.timesOfDayCardinality || [];

    // read all task for user/{userId}/today/{day}/task/{taskId}
    const todayTasksPromise: Promise<DocumentSnapshot[]> = Promise.all(
      numberToDayArray(task.daysOfTheWeek).map((day) =>
        transaction.get(userDocSnap.ref.collection('today').doc(`${day}/task/${data.taskId}`))
      ));

    // prepare timesOfDay and timesOfDayCardinality
    task.timesOfDay.forEach((timeOfDay) => {
      const indexToRemove = timesOfDay.indexOf(timeOfDay);
      if (indexToRemove > -1) {
        if (timesOfDayCardinality[indexToRemove] - 1 === 0) {
          timesOfDayCardinality.splice(indexToRemove, 1);
          timesOfDay.splice(indexToRemove, 1);
        } else {
          timesOfDayCardinality[indexToRemove]--;
        }
      }
    });

    // wait for rest

    const todayTasks = await todayTasksPromise;

    /*
    * Proceed all data
    * */

    // remove task
    transaction.delete(taskDocSnap.ref);

    // remove todayTasks
    todayTasks.forEach((todayTaskDocSnap) => transaction.delete(todayTaskDocSnap.ref));

    const userDataUpdate = {
      timesOfDayCardinality,
      taskSize: currentTaskSize - 1,
      timesOfDay
    };

    // update user
    if (userDocSnap.exists) {
      transaction.update(userDocSnap.ref, userDataUpdate);
    } else {
      transaction.create(userDocSnap.ref, userDataUpdate);
    }

    return transaction;

  }).then(() => ({
    details: 'Your task has been deleted 🤭'
  })).catch(() => {
    throw new HttpsError(
      'invalid-argument',
      'Bad Request',
      'Some went wrong 🤫 Try again 🙂'
    );
  });

};
