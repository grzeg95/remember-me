import {DocumentSnapshot} from '@google-cloud/firestore';
import {firestore} from 'firebase-admin';
import {CallableContext, HttpsError} from 'firebase-functions/lib/providers/https';

const app = firestore();

/**
 * @type Day
 **/
type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/**
 * @interface ITask
 **/
interface ITask {
  description: string;
  timesOfDay: string[];
  daysOfTheWeek: {[key in Day]: boolean}
}

/**
 * Read user data about task and remove it
 * @param data {taskId: any}
 * @param context CallableContext
 * @return Promise<{[key: string]: string}>
 **/
export const handler = (data: any, context: CallableContext): Promise<{[key: string]: string}> => {

  // interrupt if data.taskId is not correct or !auth
  if (!context.auth || !data.taskId || typeof data.taskId !== 'string') {
    throw new HttpsError(
      'invalid-argument',
      'Bad Request',
      'Some went wrong 🤫 Try again 🙂'
    );
  }

  const auth: {
    uid: string;
  } = context.auth;

  return app.runTransaction((transaction) =>

    // get user from firestore
    transaction.get(app.collection('users').doc(auth.uid)).then(async (userDocSnap) => {

      // interrupt if user is not in my firestore
      if (!userDocSnap.exists) {
        throw new HttpsError(
          'unauthenticated',
          'Register to use this functionality',
          `You dont't exist 😱`
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

          // proceed timesOfDayDocSnaps
          timesOfDayDocSnaps.forEach((timesOfDayDocSnapsDocData) => {
            if (!timesOfDayDocSnapsDocData.exists) {
              throw new HttpsError(
                'invalid-argument',
                `Time of day ${timesOfDayDocSnapsDocData.ref.path}  does not exists for task ${taskDocSnap.ref.path}`,
                'Some went wrong 🤫 Try again 🙂'
              );
            }

            const counter = timesOfDayDocSnapsDocData.data()?.counter;
            if (counter - 1 === 0) {
              transaction.delete(timesOfDayDocSnapsDocData.ref);
            } else {
              transaction.update(timesOfDayDocSnapsDocData.ref, {
                counter: counter - 1
              });
            }
          });

          // remove todayTasks
          todayTasks.forEach((todayTaskDocSnap) => {
            if (!todayTaskDocSnap.exists) {
              throw new HttpsError(
                'invalid-argument',
                `Today task ${todayTaskDocSnap.ref.path} does not exists for task ${taskDocSnap.ref.path}`,
                'Some went wrong 🤫 Try again 🙂'
              );
            }

            transaction.delete(todayTaskDocSnap.ref);
          });

          return transaction;

        });

      });

    })
  ).then(() => ({
    details: 'Your task has been deleted 🤭'
  })).catch((error: HttpsError) => {
    if (typeof error.details !== 'string') {
      console.log(error);
    }
    throw new HttpsError(
      error.code,
      error.message,
      error.details && typeof error.details === 'string' ? error.details : 'Some went wrong 🤫 Try again 🙂'
    );
  });

};
