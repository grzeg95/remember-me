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

const onCallResponse = {
    checkFunctionRequirements: {
        code: 400,
        status: 'Bad Request',
        message: 'Check function requirements'
    },
    callWhileAuthenticated: {
        code: 401,
        status: 'Unauthorized',
        message: 'The function must be called while authenticated'
    }
};

export const deleteTask = functions.runWith(runtimeOptions).region('europe-west2').https.onCall((data, context) => {

    if (!context.auth) {
        return onCallResponse.callWhileAuthenticated;
    }
    
    if (!data.taskId || typeof data.taskId !== 'string') {
        return onCallResponse.checkFunctionRequirements;
    }
    
    const uid = context.auth.uid;
    const taskId = data.taskId;

    return db.runTransaction(async transaction => {

        const promises = [];
        const userRef = db.collection('users').doc(uid);

        promises.push(
            transaction.get(
                userRef.collection('task').doc(taskId)
            ).then(doc => transaction.delete(doc.ref))
        );

        Task.daysOfTheWeek.forEach(day => {
            promises.push(
                transaction.get(
                    userRef.collection('today').doc(day).collection('task').doc(taskId)
                ).then(doc => transaction.delete(doc.ref))
            );
        });

        return Promise.all(promises);

    }).then(() => {
        return {
            code: 202,
            status: 'Accepted',
            message: 'Your task has been deleted'
        };
    }).catch(() => {
        return {
            code: 400,
            status: 'Bad Request',
            message: 'Your task has not been deleted'
        };
    });

});

export const saveTaskTransaction = async (saveTaskTransactionDocSnap: FirebaseFirestore.DocumentSnapshot, user: FirebaseFirestore.DocumentReference, task: any, created: boolean) => {

    const taskId = saveTaskTransactionDocSnap.id;

    try {

        await db.runTransaction(async (transaction) => {
            return transaction.get(saveTaskTransactionDocSnap.ref).then(saveTaskTransactionDocSnapRefDocSnap => {

                const promises: Promise<Transaction>[] = [];

                // set or update task for user/{userId}/task/{taskId}
                promises.push(transaction.get(saveTaskTransactionDocSnapRefDocSnap.ref).then(docSnap => transaction.set(docSnap.ref, task)));

                // set or update task for user/{userId}/today/{day}/task/{taskId}
                Task.daysOfTheWeek.forEach(day => {
                    const promise = transaction.get(user.collection('today').doc(day).collection('task').doc(taskId)).then(taskDocSnap => {
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
                    });
                    promises.push(promise);
                });
                return Promise.all(promises);
            });
        });
        if(created) {
            return {
                code: 201,
                status: 'Created',
                created: true,
                message: 'Your task has been created',
                taskId: taskId
            };
        }
        else {
            return {
                code: 202,
                status: 'Accepted',
                message: 'Your task has been updated'
            };
        }
    }
    catch(e) {
        if(created) {
            return saveTaskTransactionDocSnap.ref.delete().then(() => {
                return {
                    code: 400,
                    status: 'Bad Request',
                    message: 'Your task has not been touched'
                }
            });
        }
        return {
            code: 400,
            status: 'Bad Request',
            message: 'Your task has not been touched'
        };
    }

};

export const saveTask = functions.runWith(runtimeOptions).region('europe-west2').https.onCall((data, context) => {

    if (!context.auth) {
        return onCallResponse.callWhileAuthenticated;
    }

    const uid = context.auth.uid;

    if (!data.task) {
        return onCallResponse.checkFunctionRequirements;
    }

    const task = data.task;

    if (!(data.taskId && typeof data.taskId === 'string')) {
        return onCallResponse.checkFunctionRequirements;
    }

    const taskId = data.taskId;

    // TASK VALIDATION
    if (!Task.isValid(task)) {
        return onCallResponse.checkFunctionRequirements;
    }

    const user = db.collection('users').doc(uid);

    return user.collection('task').doc(taskId).get().then(docSnap => {

        if (!docSnap.exists) {
            return docSnap.ref.delete().then(() => {
                return user.collection('task').doc().get().then(doc => {
                    console.log(docSnap.data(), task);
                    return saveTaskTransaction(doc, user, task, true)
                });
            });
        } else {
            console.log(docSnap.data(), task);
            return saveTaskTransaction(docSnap, user, task, false);
        }

    });

});

export const setProgress = functions.runWith(runtimeOptions).region('europe-west2').https.onCall((data, context) => {

    if (!context.auth) {
        return onCallResponse.callWhileAuthenticated;
    }

    if (!(data.taskId && typeof data.taskId === 'string' &&
        data.todayName && typeof data.todayName === 'string' && Task.daysOfTheWeek.includes(data.todayName) &&
        data.timeOfDay && typeof data.timeOfDay === 'string' && Task.timesOfDay.includes(data.timeOfDay) &&
        data.hasOwnProperty('checked') && typeof data.checked === 'boolean')) {
        return onCallResponse.checkFunctionRequirements;
    }
    
    const uid = context.auth.uid;
    const task = db.collection('users').doc(uid).collection('today').doc(data.todayName).collection('task').doc(data.taskId);

    const toUpdateOneTimeOfDay = {
        timesOfDay: JSON.parse('{"'+data.timeOfDay+'":'+data.checked+'}')
    };

    return task.set(toUpdateOneTimeOfDay, {merge: true}).then(() => {
        return {
            code: 202,
            status: 'Accepted',
            message: 'Your progress has been updated'
        };
    }).catch(() => {
        return {
            code: 400,
            status: 'Bad Request',
            message: 'Your progress has not been touched'
        };
    });

});
