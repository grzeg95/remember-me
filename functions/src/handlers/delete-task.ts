import {DocumentSnapshot} from '@google-cloud/firestore';
import {firestore} from 'firebase-admin';
import {CallableContext, HttpsError} from 'firebase-functions/lib/providers/https';
import {Day, ITask} from '../helpers/models';
import {testRequirement} from '../helpers/test-requirement';

const app = firestore();

/**
 * Read user data about task and remove it
 * @param data {taskId: any}
 * @param context CallableContext
 * @return Promise<{[key: string]: string}>
 **/
export const handler = (data: any, context: CallableContext): Promise<{[key: string]: string}> => {

  // interrupt if data.taskId is not correct or !auth

  testRequirement(
    `not logged in`,
    !context.auth
  );

  testRequirement(
    `data has not taskId`,
    !data.taskId,
    data.taskId
  );

  testRequirement(
    `data.taskId is not string`,
    typeof data.taskId !== 'string',
    data.taskId
  );

  const auth: { uid: string } | undefined = context.auth;

  return app.runTransaction((transaction) =>

    // get user from firestore
    transaction.get(app.collection('users').doc(auth?.uid as string)).then(async (userDocSnap) => {

      const userData = userDocSnap.data();
      const isDisabled = userData?.hasOwnProperty('disabled') ? userData.disabled : false;

      if (isDisabled) {
        console.error({
          'info': `user ${auth?.uid} tried to use disabled account`
        });
        throw new HttpsError(
          'permission-denied',
          'This account is disabled',
          'Contact administrator to resolve this problem'
        );
      }

      return transaction.get(userDocSnap.ref.collection('task').doc(data.taskId)).then(async (taskDocSnap) => {

        // interrupt if user has not this task
        if (!taskDocSnap.exists) {
          console.error({
            'info': 'user tried to remove foreign task'
          });
          throw new HttpsError(
            'invalid-argument',
            `Task does not exist: ${taskDocSnap.ref.path}`,
            `Some went wrong 🤫 Try again 🙂`
          );
        }

        /*
        * Read all data
        * */

        const task: ITask = taskDocSnap.data() as ITask;

        // read all task for user/{userId}/today/{day}/task/{taskId}
        const todayTasksPromise: Promise<DocumentSnapshot[]> = Promise.all(
          (Object.keys(task.daysOfTheWeek) as Day[]).filter((dayOfTheWeek) => task.daysOfTheWeek[dayOfTheWeek]).map((day) =>
              transaction.get(userDocSnap.ref.collection('today').doc(`${day}/task/${data.taskId}`))
        ));

        // read all times of day
        const timesOfDayDocSnapsPromise: Promise<DocumentSnapshot[]> = Promise.all(task.timesOfDay.map(
          (timeOfDay) => transaction.get(userDocSnap.ref.collection('timesOfDay').doc(timeOfDay))
        ));

        return Promise.all([todayTasksPromise, timesOfDayDocSnapsPromise]).then((snapArray) => {

          /*
          * Proceed all data
          * */

          // remove task
          transaction.delete(taskDocSnap.ref);

          const todayTasks = snapArray[0];
          const timesOfDayDocSnaps = snapArray[1];

          // remove todayTasks
          todayTasks.forEach((todayTaskDocSnap) => {
            if (!todayTaskDocSnap.exists) {
              console.error({
                'info': 'user tried to remove today task for wrong task'
              });
              throw new HttpsError(
                'invalid-argument',
                `Today task ${todayTaskDocSnap.ref.path} does not exists for task ${taskDocSnap.ref.path}`,
                'Some went wrong 🤫 Try again 🙂'
              );
            }

            transaction.delete(todayTaskDocSnap.ref);
          });

          // proceed timesOfDayDocSnaps
          timesOfDayDocSnaps.forEach((timesOfDayDocSnapsDocData) => {
            const counter = timesOfDayDocSnapsDocData.data()?.counter;
            if (counter - 1 === 0) {
              transaction.delete(timesOfDayDocSnapsDocData.ref);
            } else {
              transaction.update(timesOfDayDocSnapsDocData.ref, {
                counter: counter - 1
              });
            }
          });

          return transaction;

        });

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
