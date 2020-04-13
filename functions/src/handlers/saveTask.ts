import {firestore} from 'firebase-admin';
import {CallableContext, HttpsError} from 'firebase-functions/lib/providers/https';
import {DocumentData, DocumentReference, DocumentSnapshot, Transaction} from "@google-cloud/firestore";

const app = firestore();

/**
 * @function listEqual
 * Check if two list are the same
 * @param A T[]
 * @param B T[]
 * @return boolean
 **/
export const listEqual = <T>(A: T[], B: T[]): boolean =>
  A.length === B.length && A.every(a => B.includes(a)) && B.every(b => A.includes(b));

/**
 * @interface ITask
 **/
interface ITask {
  timesOfDay: {
    [key: string]: boolean
  };
  daysOfTheWeek: {
    mon: boolean;
    tue: boolean;
    wed: boolean;
    thu: boolean;
    fri: boolean;
    sat: boolean;
    sun: boolean;
  }
  description: string;
}

/**
 * @type Day
 **/
type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/**
 * @function proceedTask
 * 1 delete or 1 write
 * Prepare today tasks
 * @param transaction Transaction
 * @param taskDocSnap DocumentSnapshot
 * @param task: ITask
 * @param day: Day
 * @return Transaction
 **/
const proceedTask = (transaction: Transaction, taskDocSnap: DocumentSnapshot, task: ITask, day: Day): Transaction => {

  if (!taskDocSnap.exists && task.daysOfTheWeek[day]) { // set
    // add task timesOfDay
    const timesOfDay: {
      [key: string]: boolean;
    } = {};
    for (const time in task.timesOfDay) {
      if (task.timesOfDay.hasOwnProperty(time) && task.timesOfDay[time]) {
        timesOfDay[time] = false;
      }
    }
    return transaction.set(taskDocSnap.ref, {
      description: task.description,
      timesOfDay: timesOfDay
    });
  } else if (taskDocSnap.exists && !task.daysOfTheWeek[day]) { // delete
    return transaction.delete(taskDocSnap.ref);
  } else if (taskDocSnap.exists && task.daysOfTheWeek[day]) { // update

    // add task timesOfDay to newTimesOfDay
    const newTimesOfDay: {
      [key: string]: boolean;
    } = {};

    // set only used timesOfDay to newTimesOfDay
    for (const time in task.timesOfDay) {
      if (task.timesOfDay.hasOwnProperty(time) && task.timesOfDay[time]) {
        newTimesOfDay[time] = false;
      }
    }

    // store current timesOfDay to oldTimesOfDay
    let oldTimesOfDay: {
      [key: string]: boolean;
    } = {};
    const docData = taskDocSnap.data() as ITask;
    if (docData) {
      oldTimesOfDay = docData.timesOfDay;
    }

    // set newTimesOfDay base on oldTimesOfDay
    // maybe there exist selected timesOfDay
    for (const timeOfDay in newTimesOfDay) {
      if (oldTimesOfDay[timeOfDay]) {
        newTimesOfDay[timeOfDay] = oldTimesOfDay[timeOfDay];
      }
    }

    return transaction.update(taskDocSnap.ref, {
      description: task.description,
      timesOfDay: newTimesOfDay
    });

  } else { // do nothing
    return transaction.delete(taskDocSnap.ref);
  }

};

/**
 * @function proceedTimesOfDay
 * MAX[20] writes and deletes
 * Update times of day
 * @param transaction Transaction
 * @param taskDocSnap DocumentSnapshot
 * @param user: DocumentReference
 * @param taskUpdated: ITask
 * @param timesOfDayDocSnaps: DocumentSnapshot<DocumentData>[]
 * @return Transaction
 **/
const proceedTimesOfDay = (transaction: Transaction, taskDocSnap: DocumentSnapshot, user: DocumentReference, taskUpdated: ITask, timesOfDayDocSnaps: DocumentSnapshot<DocumentData>[]): Transaction => {

  let created = 0;
  let updated = 0;
  let removed = 0;

  // for each timesOfDay
  Object.keys(taskUpdated.timesOfDay).forEach((timeOfDay) => {

    const inTheTimesOfDayDocSnaps = timesOfDayDocSnaps.find((timeOfDayDocSnap) => timeOfDayDocSnap.data()?.name === timeOfDay);
    let existInTheTaskDocSnap = false;

    if (!!taskDocSnap.data()?.timesOfDay && typeof (taskDocSnap.data()?.timesOfDay)[timeOfDay] === 'boolean') {
      existInTheTaskDocSnap = true;
    }

    // if timesOfDay dont exists in the timesOfDayDocSnaps than create new one
    if (!inTheTimesOfDayDocSnaps) {
      const newTimeOfDay = user.collection('timesOfDay').doc();
      transaction.create(newTimeOfDay, {
        name: timeOfDay,
        counter: 1,
        position: 0
      });
      created++;
    } else if (!existInTheTaskDocSnap) { // if timesOfDay exists in the timesOfDayDocSnaps and dont in the taskDocSnap
      transaction.update(inTheTimesOfDayDocSnaps.ref, {
        counter: inTheTimesOfDayDocSnaps.data()?.counter + 1
      });
      updated++;
    }

  });

  taskDocSnap.data() && taskDocSnap.data()?.timesOfDay && Object.keys(taskDocSnap.data()?.timesOfDay).forEach((timeOfDay) => {

    const inTheTimesOfDayDocSnaps = timesOfDayDocSnaps.find((timeOfDayDocSnap) => timeOfDayDocSnap.data()?.name === timeOfDay);

    if (inTheTimesOfDayDocSnaps && !taskUpdated.timesOfDay[timeOfDay]) {
      const counter = inTheTimesOfDayDocSnaps.data()?.counter;
      if (counter - 1 === 0) {
        transaction.delete(inTheTimesOfDayDocSnaps.ref);
        removed++;
      } else {
        transaction.update(inTheTimesOfDayDocSnaps.ref, {
          counter: counter - 1
        });
        updated++;
      }
    }
  });

  if (updated + created - removed > 20) {
    throw new HttpsError(
      'invalid-argument',
      'Bad Request',
      `You can own 20 times of day but merge this request with existing ones equals ${Object.keys(updated + created - removed).length} 🤔`
    );
  }

  return transaction;

};

/**
 * @function handler
 * 10 + MAX[20] reads
 * 1 delete
 * 1 update
 * Save new task
 * @param data {
    task: {
      timesOfDay: {
        [key: string]: string
      },
      daysOfTheWeek: {
        mon: boolean
        tue: boolean
        wed: boolean
        thu: boolean
        fri: boolean
        sat: boolean
        sun: boolean
      },
      description: string
    },
    taskId: string
  }
 * @param context functions.https.CallableContext
 * @return Promise<T>
 **/
export const handler = (data: any, context: CallableContext): Promise<any> => {

  if (
    !context.auth ||

    // data includes task: object and taskId: string
    typeof data !== 'object' ||
    Object.keys(data).length !== 2 ||
    !listEqual(Object.keys(data), ['task', 'taskId']) ||
    typeof data.taskId !== 'string' ||
    typeof data.task !== 'object' ||

    // task includes description:string[4,40],
    // daysOfTheWeek:{ all mon,tue,wed,thu,fri,sat,sun that are booleans},
    // timesOfDay: {[key: string]: string}
    Object.keys(data.task).length !== 3 ||
    !listEqual(Object.keys(data.task), ['description', 'daysOfTheWeek', 'timesOfDay']) ||
    typeof data.task.description !== 'string' || data.task.description.length <= 3 || data.task.description.length > 40 || // description length must be between 4 add 40
    Object.keys(data.task.daysOfTheWeek).length !== 7 || // 7 days in week
    !listEqual(Object.keys(data.task.daysOfTheWeek), ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) || // mon, tue, wed, thu, fri, sat, sun ...
    Object.keys(data.task.daysOfTheWeek).some((e) => typeof data.task.daysOfTheWeek[e as Day] !== 'boolean') || // ... task.daysOfTheWeek must contains booleans properties and ...
    !Object.keys(data.task.daysOfTheWeek).some((e) => data.task.daysOfTheWeek[e as Day]) || // ... some true

    // timesOfDay in object based on name: true key/value
    typeof data.task.timesOfDay !== 'object' ||
    Object.keys(data.task.timesOfDay).length === 0 || // data.timesOfDayKeys is based on at least one object ...
    Object.keys(data.task.timesOfDay).length > 20 || // ... to max 20 ...
    Object.keys(data.task.timesOfDay).some((e) => typeof data.task.timesOfDay[e] !== 'boolean' || !data.task.timesOfDay[e]) || // that contains true property ...
    Object.keys(data.task.timesOfDay).some((e) => e.trim().length < 1 || e.trim().length > 20) // ... timesOfDay length must be between 1 add 20
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Bad Request',
      'Some went wrong 🤫 Try again 🙂'
    );
  }

  const auth: {
    uid: string;
  } = context.auth;

  let created = false;
  let taskId = data.taskId;

  return app.runTransaction((transaction) =>
    transaction.get(app.collection('users').doc(auth.uid)).then(async (userDocSnap) => {

      // interrupt if user is not in my firestore
      if (!userDocSnap.exists) {
        throw new HttpsError(
          'unauthenticated',
          'Register to use this functionality',
          `You dont't exist 😱`
        );
      }

      return transaction.get(userDocSnap.ref.collection('task').doc(taskId)).then(async (taskDocSnapTmp) => {

        /*
        * Read all data
        * */

        // read task or create it
        let taskDocSnap: DocumentSnapshot<DocumentData>;
        if (!taskDocSnapTmp.exists) {
          created = true;
          taskDocSnap = await transaction.get(userDocSnap.ref.collection('task').doc()).then(async (newTaskSnap) => newTaskSnap);
          taskId = taskDocSnap.id;
        } else {
          taskDocSnap = taskDocSnapTmp;
        }

        // read all task for user/{userId}/today/{day}/task/{taskId}
        const todayTaskDocSnapPromise: Promise<{ docSnap: DocumentSnapshot, day: Day }>[] = [];
        (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as Day[]).forEach((day) => {
          todayTaskDocSnapPromise.push(transaction.get(userDocSnap.ref.collection('today').doc(`${day}/task/${taskDocSnap.id}`)).then((docSnap) => ({
            docSnap,
            day
          })));
        });
        const todayTaskDocSnaps: { docSnap: DocumentSnapshot, day: Day }[] = await Promise.all(todayTaskDocSnapPromise);

        // read all times of day
        const timesOfDayDocSnaps = await userDocSnap.ref.collection('timesOfDay').listDocuments().then(async (docsRef) => {
          const timesOfDayDocSnapsPromise: Promise<DocumentSnapshot<DocumentData>>[] = [];
          docsRef.forEach((docRef) => {
            timesOfDayDocSnapsPromise.push(transaction.get(docRef).then((docSnap) => docSnap));
          });
          return await Promise.all(timesOfDayDocSnapsPromise);
        });

        /*
        * Proceed all data
        * */

        proceedTimesOfDay(transaction, taskDocSnap, userDocSnap.ref, data.task, timesOfDayDocSnaps);

        // proceedEveryDay
        todayTaskDocSnaps.forEach((readReady) =>
          proceedTask(transaction, readReady.docSnap, data.task, readReady.day)
        );

        // update task
        transaction.set(taskDocSnap.ref, data.task);

        // delete taskDocSnapTmp if created
        if (created) {
          transaction.delete(taskDocSnapTmp.ref);
        }

        return transaction;

      });

    })
  ).then(() =>
    created ? ({
      created: true,
      details: 'Your task has been created 😉',
      taskId: taskId
    }) : ({
      created: false,
      details: 'Your task has been updated 🙃',
      taskId: taskId
    })
  ).catch((error: HttpsError) => {
      throw new HttpsError(
        'internal',
        error.message,
        error.details && typeof error.details === 'string' ? error.details : 'Some went wrong 🤫 Try again 🙂'
      );
    }
  );

};
