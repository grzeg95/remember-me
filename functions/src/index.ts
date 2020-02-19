import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {Task} from './task';
import {Transaction} from '@google-cloud/firestore';

admin.initializeApp({
    credential: admin.credential.cert('./remember-me-3-admin-meta.json')
});

const db = admin.firestore();

const runtimeOptions: functions.RuntimeOptions = {
    timeoutSeconds: 5,
    memory: "128MB"
};

export const deleteTask = functions.runWith(runtimeOptions).region('europe-west2').https.onCall((data, context) => {

  const auth = context.auth;

  // interrupt if data.taskId is not correct or !auth
  if (!data.taskId || typeof data.taskId !== 'string' || !auth) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Bad Request',
      'Check function requirements'
    );
  }

  const taskId = data.taskId;

  return db.runTransaction((transaction) =>

    // get user from firestore
    transaction.get(db.collection('users').doc(auth.uid)).then((userDoc) => {

      // interrupt if user is not in my firestore
      if (!userDoc.exists) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Bad Request',
          'Check function requirements'
        );
      }

      // remove all today tasks
      const promises: Promise<any>[] = [];
      promises.push(userDoc.ref.collection('today').listDocuments().then(taskDaysDoc => {
        const taskDaysDocPromises: Promise<Transaction>[] = [];
        taskDaysDoc.forEach((taskDayDoc) =>
          taskDaysDocPromises.push(transaction.get(taskDayDoc.collection('task').doc(taskId)).then((taskDayDocTask) =>
              transaction.delete(taskDayDocTask.ref)
            )
          )
        );
        return Promise.all(taskDaysDocPromises);
      }));

      // remove task it self
      promises.push(transaction.get(userDoc.ref.collection('task').doc(taskId)).then(taskDoc => transaction.delete(taskDoc.ref)));

      // close all operations in the transaction
      return Promise.all(promises);

    })
  ).then(() => {
    return {
      message: 'Your task has been deleted'
    };
  }).catch((e) => {
    throw new functions.https.HttpsError(
      'internal',
      e,
      'Your task has not been deleted'
    );
  });

});

export const saveTaskTransaction = async (transaction: Transaction, saveTaskDocSnap: FirebaseFirestore.DocumentSnapshot, user: FirebaseFirestore.DocumentReference, task: any) =>
  transaction.get(saveTaskDocSnap.ref).then(saveTaskTransactionDocSnapRefDocSnap => {

    const promises: Promise<Transaction>[] = [];

    // set or update task for user/{userId}/task/{taskId}
    promises.push(transaction.get(saveTaskTransactionDocSnapRefDocSnap.ref).then(docSnap => transaction.set(docSnap.ref, task)));

    // set or update task for user/{userId}/today/{day}/task/{taskId}
    Task.daysOfTheWeek.forEach(day => {
      const promise = transaction.get(user.collection('today').doc(day).collection('task').doc(saveTaskDocSnap.id)).then(taskDocSnap => {
          if (!taskDocSnap.exists && task.daysOfTheWeek[day]) { // set
            // add task timesOfDay
            const timesOfDay: {
              [key: string]: boolean;
            } = {};
            if (task.timesOfDay['duringTheDay']) {
              timesOfDay['duringTheDay'] = false;
            } else {
              for (const time in task.timesOfDay) {
                if (task.timesOfDay.hasOwnProperty(time)) {
                  timesOfDay[time] = false;
                }
              }
            }
            return transaction.set(taskDocSnap.ref, {
              description: task.description,
              timesOfDay: timesOfDay
            });
          } else if(taskDocSnap.exists && !task.daysOfTheWeek[day]) { // delete
            return transaction.delete(taskDocSnap.ref);
          } else if(taskDocSnap.exists && task.daysOfTheWeek[day]) { // update

            // add task timesOfDay to newTimesOfDay
            const newTimesOfDay: {
              [key: string]: boolean;
            } = {};

            // set only used timesOfDay to newTimesOfDay
            for (const time in task.timesOfDay) {
              if (task.timesOfDay.hasOwnProperty(time)) {
                newTimesOfDay[time] = false;
              }
            }

            // store current timesOfDay to oldTimesOfDay
            let oldTimesOfDay: {
              [key: string]: boolean;
            } = {};
            const docData = taskDocSnap.data();
            if (docData) {
              oldTimesOfDay = docData['timesOfDay'];
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
        }
      );
      promises.push(promise);
    });
    return Promise.all(promises);
  });

export const saveTask = functions.runWith(runtimeOptions).region('europe-west2').https.onCall((data, context) => {

  const auth = context.auth;

  if (!data.task || !auth) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Bad Request',
      'Check function requirements'
    );
  }

  const task = data.task;

  if (!(data.taskId && typeof data.taskId === 'string')) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Bad Request',
      'Check function requirements'
    );
  }

  let taskId = data.taskId;

  // TASK VALIDATION
  if (!Task.isValid(task)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Bad Request',
      'Check function requirements'
    );
  }

  let created = false;

  return db.runTransaction((transaction) =>
    transaction.get(db.collection('users').doc(auth.uid)).then(userDoc => {

      // interrupt if user is not in my firestore
      if (!userDoc.exists) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Bad Request',
          'Check function requirements'
        );
      }

      return transaction.get(userDoc.ref.collection('task').doc(taskId)).then((taskSnap) => {

        if (!taskSnap.exists) {
          created = true;
          return transaction.get(userDoc.ref.collection('task').doc()).then((newTaskSnap) => {
            taskId = newTaskSnap.id;
            return saveTaskTransaction(transaction, newTaskSnap, userDoc.ref, task);
          });
        } else {
          return saveTaskTransaction(transaction, taskSnap, userDoc.ref, task);
        }

      });

    })
  ).then(() => {
    if (created) {
      return {
        code: 201,
        status: 'Created',
        created: true,
        message: 'Your task has been created',
        taskId: taskId
      };
    } else {
      return {
        code: 202,
        status: 'Accepted',
        message: 'Your task has been updated'
      };
    }
  }).catch((e) => {
      throw new functions.https.HttpsError(
        'internal',
        e,
        'Your task has not been deleted'
      );
    }
  );

});

export const setProgress = functions.runWith(runtimeOptions).region('europe-west2').https.onCall((data, context) => {

  const auth = context.auth;

  if (!(data.taskId && typeof data.taskId === 'string' &&
    data.todayName && typeof data.todayName === 'string' && Task.daysOfTheWeek.includes(data.todayName) &&
    data.timeOfDay && typeof data.timeOfDay === 'string' && Task.timesOfDay.includes(data.timeOfDay) &&
    data.hasOwnProperty('checked') && typeof data.checked === 'boolean') || !auth) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Bad Request',
      'Check function requirements'
    );
  }

  return db.runTransaction((transaction) =>
    transaction.get(db.collection('users').doc(auth.uid)).then(userDoc => {

      // interrupt if user is not in my firestore
      if (!userDoc.exists) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Bad Request',
          'Check function requirements'
        );
      }

      return transaction.get(userDoc.ref.collection('today').doc(data.todayName).collection('task').doc(data.taskId)).then((todayTaskSnap) => {
        const toUpdateOneTimeOfDay = {
          timesOfDay: JSON.parse('{"'+data.timeOfDay+'":'+data.checked+'}')
        };
        return transaction.set(todayTaskSnap.ref, toUpdateOneTimeOfDay, {merge: true});
      });

    })).then(() => {
      return {
        message: 'Your progress has been updated'
      };
    }).catch((e) => {
      throw new functions.https.HttpsError(
        'internal',
        e,
        'Your task has not been deleted'
      );
    });

});
