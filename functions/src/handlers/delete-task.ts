import {firestore} from 'firebase-admin';
import {CallableContext, HttpsError} from 'firebase-functions/lib/providers/https';
import {Day, Task, TimeOfDay} from '../helpers/models';
import {testRequirement} from '../helpers/test-requirement';
import {getTimeOfDay} from '../helpers/timeOfDay';
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
  testRequirement(!context.auth);

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

    let currentTimesOfDaySize = userDocSnap.data()?.timesOfDaySize || 0;
    const currentTaskSize = userDocSnap.data()?.taskSize;

    // read all task for user/{userId}/today/{day}/task/{taskId}
    const todayTasksPromise: Promise<DocumentSnapshot[]> = Promise.all(
      (Object.keys(task.daysOfTheWeek) as Day[]).filter((dayOfTheWeek) => task.daysOfTheWeek[dayOfTheWeek]).map((day) =>
        transaction.get(userDocSnap.ref.collection('today').doc(`${day}/task/${data.taskId}`))
      ));

    // read all times of day
    const toRemove = task.timesOfDay;
    const affected: { [p: string]: TimeOfDay } = {};
    const affectedPromise: { [p: string]: Promise<TimeOfDay> } = {};

    for (const timeOfDayId of toRemove) {
      if (!affectedPromise[timeOfDayId]) {
        affectedPromise[timeOfDayId] = getTimeOfDay(transaction, userDocSnap, timeOfDayId);
      }
    }

    for (const timeOfDayId of toRemove) {

      if (!affected[timeOfDayId]) {
        affected[timeOfDayId] = await affectedPromise[timeOfDayId];
      }

      if (affected[timeOfDayId].data.counter - 1 === 0) {
        affected[timeOfDayId].status = 'removed';
        currentTimesOfDaySize--;

        let getTimeOfDayNextPromise;
        if (affected[timeOfDayId].data.next && !affected[affected[timeOfDayId].data.next as string]) {
          getTimeOfDayNextPromise = getTimeOfDay(transaction, userDocSnap, affected[timeOfDayId].data.next as string);
        }

        let getTimeOfDayPrevPromise;
        if (affected[timeOfDayId].data.prev && !affected[affected[timeOfDayId].data.prev as string]) {
          getTimeOfDayPrevPromise = getTimeOfDay(transaction, userDocSnap, affected[timeOfDayId].data.prev as string);
        }

        if (getTimeOfDayNextPromise) {
          affected[affected[timeOfDayId].data.next as string] = await getTimeOfDayNextPromise;
        }

        if (getTimeOfDayPrevPromise) {
          affected[affected[timeOfDayId].data.prev as string] = await getTimeOfDayPrevPromise;
        }

        if (affected[timeOfDayId].data.next) {
          affected[affected[timeOfDayId].data.next as string].data.prev = affected[timeOfDayId].data.prev;
        }

        if (affected[timeOfDayId].data.prev) {
          affected[affected[timeOfDayId].data.prev as string].data.next = affected[timeOfDayId].data.next;
        }

      } else {
        affected[timeOfDayId].data.counter = affected[timeOfDayId].data.counter - 1;
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
    todayTasks.forEach((todayTaskDocSnap) =>
      transaction.delete(todayTaskDocSnap.ref));

    // proceed timesOfDayDocSnaps
    for (const id of Object.getOwnPropertyNames(affected)) {
      const timeOfDay = affected[id];
      if (timeOfDay.status === 'removed') {
        transaction.delete(timeOfDay.ref);
      }
      if (timeOfDay.status === 'updated') {
        transaction.update(timeOfDay.ref, timeOfDay.data);
      }
    }

    // update user
    if (userDocSnap.exists) {
      transaction.update(userDocSnap.ref, {
        timesOfDaySize: currentTimesOfDaySize,
        taskSize: currentTaskSize - 1
      });
    } else {
      transaction.create(userDocSnap.ref, {
        timesOfDaySize: currentTimesOfDaySize,
        taskSize: currentTaskSize - 1
      });
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
