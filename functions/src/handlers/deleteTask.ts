import {firestore} from 'firebase-admin';
import {CallableContext, HttpsError} from 'firebase-functions/lib/providers/https';
import {DocumentData} from '@google-cloud/firestore';

const app = firestore();

/**
 * @interface ITask
 **/
interface ITask {
  description: string;
  timesOfDay: string[];
  daysOfTheWeek: {
    mon: boolean;
    tue: boolean;
    wed: boolean;
    thu: boolean;
    fri: boolean;
    sat: boolean;
    sun: boolean;
  }
}

/**
 * 9 + MAX[20] reads
 * 8 deletes + (MAX[20] deletes and updates)
 * Read all user data about task and remove it
 * @param data {taskId: any}
 * @param context functions.https.CallableContext
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
            'Task does not exist',
            `Some went wrong 🤫 Try again 🙂`
          );
        }

        /*
        * Read all data
        * */

        // read all task for user/{userId}/today/{day}/task/{taskId}
        const todayTasks = await Promise.all((['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']).map((day) =>
          transaction.get(userDocSnap.ref.collection('today').doc(`${day}/task/${data.taskId}`))
        ));

        // read all times of day
        const timesOfDayDocSnaps: {[timeOfDay: string]: DocumentData} = (
          await userDocSnap.ref.collection('timesOfDay').listDocuments().then(async (docsRef) =>
            await Promise.all(docsRef.map((docRef) =>
              transaction.get(docRef).then((docSnap) => docSnap)
            ))
          )
        ).reduce((acc, curr) => ({...acc, ...{[curr.data()?.name]: curr}}), {});

        /*
        * Proceed all data
        * */

        // proceed timesOfDayDocSnaps
        const task: ITask = taskDocSnap.data() as ITask;
        task.timesOfDay.forEach((timeOfDay) => {
          const inTheTimesOfDayDocSnap = timesOfDayDocSnaps[timeOfDay];
          if (inTheTimesOfDayDocSnap) {
            const counter = inTheTimesOfDayDocSnap.data()?.counter;
            if (counter - 1 === 0) {
              transaction.delete(inTheTimesOfDayDocSnap.ref);
            } else {
              transaction.update(inTheTimesOfDayDocSnap.ref, {
                counter: counter - 1
              });
            }
          }
        });

        // remove task
        transaction.delete(taskDocSnap.ref);

        // remove todayTasks
        todayTasks.forEach((docSnap) =>
          transaction.delete(docSnap.ref)
        );

        return transaction;
      });

    })
  ).then(() => ({
    details: 'Your task has been deleted 🤭'
  })).catch((error: HttpsError) => {
    throw new HttpsError(
      'internal',
      error.message,
      error.details && typeof error.details === 'string' ? error.details : 'Some went wrong 🤫 Try again 🙂'
    );
  });

};
