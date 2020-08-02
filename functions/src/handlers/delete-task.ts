import {firestore} from 'firebase-admin';
import {CallableContext, HttpsError} from 'firebase-functions/lib/providers/https';
import {Day, Task} from '../helpers/models';
import {testRequirement} from '../helpers/test-requirement';
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

  return app.runTransaction((transaction) =>

    // get user from firestore
    transaction.get(app.collection('users').doc(auth?.uid as string)).then(async (userDocSnap) => {

      const userData = userDocSnap.data();
      const isDisabled = userData?.hasOwnProperty('disabled') ? userData.disabled : false;

      if (isDisabled) {
        throw new HttpsError(
          'permission-denied',
          'This account is disabled',
          'Contact administrator to resolve this problem'
        );
      }

      return transaction.get(userDocSnap.ref.collection('task').doc(data.taskId)).then(async (taskDocSnap) => {

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
        const timesOfDayDocSnapsPromise: Promise<DocumentSnapshot[]> = Promise.all(task.timesOfDay.map(
          (timeOfDay) => transaction.get(userDocSnap.ref.collection('timesOfDay').doc(timeOfDay))
        ));

        const timesOfDayDocSnaps: {[p: string]: DocumentSnapshot} = {};
        (await timesOfDayDocSnapsPromise).forEach((e) => timesOfDayDocSnaps[e.id] = e);

        const toUpdatePromise: Promise<DocumentSnapshot>[] = [];

        for (const timeOfDay in timesOfDayDocSnaps) {
          if (timesOfDayDocSnaps.hasOwnProperty(timeOfDay)) {
            const counter = timesOfDayDocSnaps[timeOfDay].data()?.counter;
            if (counter - 1 === 0) {
              if (timesOfDayDocSnaps[timeOfDay].data()?.prev) {
                toUpdatePromise.push(transaction.get(userDocSnap.ref.collection('timesOfDay').doc(timesOfDayDocSnaps[timeOfDay].data()?.prev)).then((docSnap) => docSnap));
              }
              if (timesOfDayDocSnaps[timeOfDay].data()?.next) {
                toUpdatePromise.push(transaction.get(userDocSnap.ref.collection('timesOfDay').doc(timesOfDayDocSnaps[timeOfDay].data()?.next)).then((docSnap) => docSnap));
              }
            }
          }
        }

        const todayTasks = await todayTasksPromise;
        const toUpdate: {[p: string]: DocumentSnapshot} = {};
        (await Promise.all(toUpdatePromise)).forEach((e) => {toUpdate[e.id] = e});

        /*
        * Proceed all data
        * */

        // remove task
        transaction.delete(taskDocSnap.ref);

        // remove todayTasks
        todayTasks.forEach((todayTaskDocSnap) =>
          transaction.delete(todayTaskDocSnap.ref));

        // proceed timesOfDayDocSnaps
        for (const timeOfDay in timesOfDayDocSnaps) {
          if (timesOfDayDocSnaps.hasOwnProperty(timeOfDay)) {
            const counter = timesOfDayDocSnaps[timeOfDay].data()?.counter;
            if (counter - 1 === 0) {

              const prev = timesOfDayDocSnaps[timeOfDay].data()?.prev;
              const next = timesOfDayDocSnaps[timeOfDay].data()?.next;

              if (toUpdate[prev]) {
                transaction.update(toUpdate[prev].ref, {next});
              }

              if (toUpdate[next]) {
                transaction.update(toUpdate[next].ref, {prev});
              }

              transaction.delete(timesOfDayDocSnaps[timeOfDay].ref);
              delete toUpdate[timeOfDay];
              currentTimesOfDaySize--;
            } else {

              transaction.update(timesOfDayDocSnaps[timeOfDay].ref, {
                counter: counter - 1
              });
            }
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

      });

    })
  ).then(() => ({
    details: 'Your task has been deleted 🤭'
  })).catch((error: HttpsError) => {
    const details = error.code === 'permission-denied' ? '' : error.details && typeof error.details === 'string' ? error.details : 'Some went wrong 🤫 Try again 🙂';
    throw new HttpsError(
      error.code,
      error.message,
      details
    );
  });

};
