import {firestore} from 'firebase-admin';
import {CallableContext, HttpsError} from 'firebase-functions/lib/providers/https';
import DocumentReference = FirebaseFirestore.DocumentReference;

const app = firestore();

/**
 * @interface ITask
 **/
interface ITask {
  description: string;
  timesOfDay: string[];
  timesOfDayRef: DocumentReference[];
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

        const task: ITask = taskDocSnap.data() as ITask;
        const taskDaysOfTheWeekInUse = (Object.keys(task.daysOfTheWeek) as ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun') []).filter((dayOfWeekKey) => task.daysOfTheWeek[dayOfWeekKey]);

        // read all task for user/{userId}/today/{day}/task/{taskId}
        const todayTasks = await Promise.all(taskDaysOfTheWeekInUse.map((day) =>
          transaction.get(userDocSnap.ref.collection('today').doc(`${day}/task/${data.taskId}`))
        ));

        // read all times of day
        const timesOfDayDocSnaps = await Promise.all(task.timesOfDayRef.map(
          (docRef) => transaction.get(docRef)
        ))

        /*
        * Proceed all data
        * */

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
