import {firestore} from 'firebase-admin';
import {CallableContext, HttpsError} from 'firebase-functions/lib/providers/https';
import {DocumentReference, DocumentSnapshot, Transaction} from "@google-cloud/firestore";

const app = firestore();

/**
 * @function listEqual
 * Check if two list are the same
 * @param A T[]
 * @param B T[]
 * @return boolean
 **/
export const listEqual = <T>(A: T[], B: T[]): boolean =>
  A.length === B.length && A.every(a => B.includes(a));

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
 * @interface ITodayTask
 **/
interface ITodayTask {
  description: string;
  timesOfDay: {
    [key: string]: boolean
  };
}

/**
 * @type Day
 **/
type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/**
 * @function proceedTodayTask
 * 1 delete or 1 write
 * Prepare today tasks
 * @param transaction Transaction
 * @param todayTaskDocSnap DocumentSnapshot
 * @param task: ITask
 * @param day: Day
 * @return Transaction
 **/
const proceedTodayTask = (transaction: Transaction, todayTaskDocSnap: DocumentSnapshot, task: ITask, day: Day): Transaction => {

  if (!todayTaskDocSnap.exists && task.daysOfTheWeek[day]) { // set
    // add task timesOfDay
    const timesOfDay: {
      [key: string]: boolean;
    } = {};

    task.timesOfDay.forEach((timeOfDay) => timesOfDay[timeOfDay.trim()] = false);

    return transaction.set(todayTaskDocSnap.ref, {
      description: task.description,
      timesOfDay: timesOfDay
    });
  } else if (todayTaskDocSnap.exists && !task.daysOfTheWeek[day]) { // delete
    return transaction.delete(todayTaskDocSnap.ref);
  } else if (todayTaskDocSnap.exists && task.daysOfTheWeek[day]) { // update

    // add task timesOfDay to newTimesOfDay
    const newTimesOfDay: {
      [key: string]: boolean;
    } = {};

    // select inserted task timesOfDay to newTimesOfDay
    const taskTimesOdDaySet = new Set(task.timesOfDay);
    taskTimesOdDaySet.forEach((timeOfDay) => {
      newTimesOfDay[timeOfDay.trim()] = false;
    });

    // select current stored task timesOfDay to oldTimesOfDay
    // there can be selected true value
    let oldTimesOfDay: {
      [key: string]: boolean;
    } = {};
    const docData = todayTaskDocSnap.data() as ITodayTask;
    if (docData) {
      oldTimesOfDay = docData.timesOfDay;
    }

    // maybe there exist selected timesOfDay
    Object.keys(newTimesOfDay).forEach((newTimeOfDay) => {
      if (oldTimesOfDay[newTimeOfDay]) {
        newTimesOfDay[newTimeOfDay] = oldTimesOfDay[newTimeOfDay];
      }
    });

    return transaction.update(todayTaskDocSnap.ref, {
      description: task.description,
      timesOfDay: newTimesOfDay
    });

  } else { // do nothing
    return transaction.delete(todayTaskDocSnap.ref);
  }

};

/**
 * @function proceedTimesOfDay
 * MAX[20] writes and deletes
 * Update times of day
 * @param transaction Transaction
 * @param taskDocSnap DocumentSnapshot
 * @param user: DocumentReference
 * @param task: ITask
 * @param timesOfDayDocSnaps: DocumentSnapshot<DocumentData>[]
 * @return Transaction
 **/
const proceedTimesOfDay = (transaction: Transaction, taskDocSnap: DocumentSnapshot, user: DocumentReference, task: ITask, timesOfDayDocSnaps: DocumentSnapshot[]): Transaction => {

  let created = 0;
  let updated = 0;
  let removed = 0;
  const taskTimesOfDaySet = new Set(task.timesOfDay);
  const taskDocSnapTimesOfDaySet = new Set(taskDocSnap.data()?.timesOfDay as string[]);

  // for each taskTimesOfDaySet
  // create or increment inTheTimesOfDayDocSnaps
  taskTimesOfDaySet.forEach((timeOfDay) => {

    const inTheTimesOfDayDocSnaps = timesOfDayDocSnaps.find((timeOfDayDocSnap) => timeOfDayDocSnap.data()?.name === timeOfDay);
    let existInTheTaskDocSnap = false;

    if (taskDocSnapTimesOfDaySet.has(timeOfDay)) {
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

  // for each taskDocSnapTimesOfDaySet
  // remove or decrement inTheTimesOfDayDocSnaps
  taskDocSnapTimesOfDaySet.forEach((timeOfDay: string) => {

    const inTheTimesOfDayDocSnaps = timesOfDayDocSnaps.find((timeOfDayDocSnap) => timeOfDayDocSnap.data()?.name === timeOfDay);

    if (inTheTimesOfDayDocSnaps && !taskTimesOfDaySet.has(timeOfDay)) {
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
      timesOfDay: string[],
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
 * @param context CallableContext
 * @return Promise<{[key: string]: string | boolean}>
 **/
export const handler = (data: any, context: CallableContext): Promise<{[key: string]: string | boolean}> => {

  let dataKeys;
  let dataTaskKeys;
  let dataTaskDaysOfTheWeekKeys;

  if (
    !context.auth ||

    // data includes task: object and taskId: string
    typeof data !== 'object' ||
    (dataKeys = Object.keys(data)).length !== 2 ||
    !listEqual(dataKeys, ['task', 'taskId']) ||
    typeof data.taskId !== 'string' ||
    typeof data.task !== 'object' ||

    // task includes description:string[4,40],
    // daysOfTheWeek:{ all mon,tue,wed,thu,fri,sat,sun that are booleans},
    // timesOfDay: {[key: string]: string}
    (dataTaskKeys = Object.keys(data.task)).length !== 3 ||
    !listEqual(dataTaskKeys, ['description', 'daysOfTheWeek', 'timesOfDay']) ||
    typeof data.task.description !== 'string' || data.task.description.length <= 3 || data.task.description.length > 40 || // description length must be between 4 add 40
    (dataTaskDaysOfTheWeekKeys = Object.keys(data.task.daysOfTheWeek)).length !== 7 || // 7 days in week
    !listEqual(dataTaskDaysOfTheWeekKeys, ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) || // mon, tue, wed, thu, fri, sat, sun ...
    dataTaskDaysOfTheWeekKeys.some((e) => typeof data.task.daysOfTheWeek[e as Day] !== 'boolean') || // ... task.daysOfTheWeek must contains booleans properties and ...
    !dataTaskDaysOfTheWeekKeys.some((e) => data.task.daysOfTheWeek[e as Day]) || // ... some true

    // timesOfDay in object based on string array 20 len with values 1 to 20 len
    !Array.isArray(data.task.timesOfDay) ||
    data.task.timesOfDay.length === 0 ||
    data.task.timesOfDay.length > 20 ||
    new Set(data.task.timesOfDay).size !== data.task.timesOfDay.length ||
    data.task.timesOfDay.some((e: any) => typeof e !== 'string' || e.trim().length < 1 || e.trim().length > 20) // ... timesOfDay length must be between 1 add 20
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
  let taskId: string = data.taskId;

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
        let taskDocSnap: DocumentSnapshot;
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
          todayTaskDocSnapPromise
            .push(transaction
              .get(userDocSnap.ref.collection('today')
                .doc(`${day}/task/${taskDocSnap.id}`))
              .then((docSnap) => ({docSnap, day})));
        });
        const todayTaskDocSnaps: { docSnap: DocumentSnapshot, day: Day }[] = await Promise.all(todayTaskDocSnapPromise);

        // read all times of day
        const timesOfDayDocSnaps = await userDocSnap.ref.collection('timesOfDay').listDocuments().then(async (docsRef) => {
          const timesOfDayDocSnapsPromise: Promise<DocumentSnapshot>[] = [];
          docsRef.forEach((docRef) => timesOfDayDocSnapsPromise.push(transaction.get(docRef).then((docSnap) => docSnap)));
          return await Promise.all(timesOfDayDocSnapsPromise);
        });

        /*
        * Proceed all data
        * */

        proceedTimesOfDay(transaction, taskDocSnap, userDocSnap.ref, data.task, timesOfDayDocSnaps);

        // proceedEveryDay
        todayTaskDocSnaps.forEach((todayTaskDocSnap) =>
          proceedTodayTask(transaction, todayTaskDocSnap.docSnap, data.task, todayTaskDocSnap.day)
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
      'created': true,
      'details': 'Your task has been created 😉',
      'taskId': taskId
    }) : ({
      'created': false,
      'details': 'Your task has been updated 🙃',
      'taskId': taskId
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
