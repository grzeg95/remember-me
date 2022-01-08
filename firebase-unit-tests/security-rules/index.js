process.env.FIRESTORE_EMULATOR_HOST = 'localhost:9090';
const firebase = require('@firebase/rules-unit-testing');

const projectId = 'remember-me-dev';
const myId = 'myId_2';
const theirId = 'theirId_2';
const myAuth = {
    uid: myId,
    email: 'myEmail_2'
};

const getFirestore = (auth) => firebase.initializeTestApp({projectId, auth}).firestore();
const getFirestoreAdmin = () => firebase.initializeAdminApp({projectId}).firestore();

describe('Firestore security rules tests', () => {

    const me = getFirestore(myAuth);
    const guest = getFirestore();
    const admin = getFirestoreAdmin();
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const round_0 = 'round_0';
    const timeOfDay_0 = 'timesOfDay_0';
    const timeOfDay_1 = 'timesOfDay_1';
    const task_0 = 'task_0';
    const fbclId_0 = 'fbclId_0';

    describe('fbclid', () => {

        describe(`Can't list /fbclid/{fbclId}`, async () => {

            it(`without query.limit`, async () => {
                const collection = guest.collection('fbclid');
                await firebase.assertFails(collection.get());
            });

            it(`without query.limit != 1, 2`, async () => {
                const collection = guest.collection('fbclid').limit(2);
                await firebase.assertFails(collection.get());
            });
        });

        describe(`Can list /fbclid/{fbclId}`, async () => {

            it(`with query.limit = 1`, async () => {
                const collection = guest.collection('fbclid').limit(1);
                await firebase.assertSucceeds(collection.get());
            });
        });

        describe(`Can't create /fbclid/{fbclId}`, async () => {

            const tests = [
                {},
                {
                    entered: 1
                },
                {
                    id: fbclId_0
                },
                {
                    entered: null,
                    id: fbclId_0
                },
                {
                    entered: {},
                    id: fbclId_0
                },
                {
                    entered: 0,
                    id: fbclId_0
                },
                {
                    entered: '',
                    id: fbclId_0
                },
                {
                    entered: '1',
                    id: fbclId_0
                },
                {
                    entered: [],
                    id: fbclId_0
                },
                {
                    entered: true,
                    id: fbclId_0
                },
                {
                    entered: false,
                    id: fbclId_0
                },
                {
                    entered: 1,
                    id: null
                },
                {
                    entered: 1,
                    id: {}
                },
                {
                    entered: 1,
                    id: 0
                },
                {
                    entered: 1,
                    id: ''
                },
                {
                    entered: 1,
                    id: []
                },
                {
                    entered: 1,
                    id: true
                },
                {
                    entered: 1,
                    id: false
                }
            ];

            tests.forEach((test) => it(JSON.stringify(test), async () => {
                await admin.collection('fbclid').doc(fbclId_0).delete();
                const doc = guest.collection('fbclid').doc(fbclId_0).set(test);
                await firebase.assertFails(doc);
            }));
        });

        describe(`Can create /fbclid/{fbclId}`, async () => {

            const test = {
                entered: 1,
                id: fbclId_0
            };

            it(JSON.stringify(test), async () => {
                await admin.collection('fbclid').doc(fbclId_0).delete();
                const doc = guest.collection('fbclid').doc(fbclId_0).set(test);
                await firebase.assertSucceeds(doc);
            })
        });

        const toUpdate = {
            id: fbclId_0,
            entered: 1
        };

        describe(`Can't update /fbclid/{fbclId} ${JSON.stringify(toUpdate)}`, async () => {

            it(`Does not exist`, async () => {
                await admin.collection('fbclid').doc(fbclId_0).delete();

                const doc = guest.collection('fbclid').doc(fbclId_0).update({
                    id: fbclId_0,
                    entered: 2
                });
                await firebase.assertFails(doc);
            });

            const tests = [
                {},
                {
                    id: 'other',
                    entered: 2
                },
                {
                    id: fbclId_0,
                    entered: 0
                },
                {
                    id: fbclId_0,
                    entered: 1
                },
                {
                    id: fbclId_0,
                    entered: 3
                }
            ];

            tests.forEach((test) => it(JSON.stringify(test), async () => {
                await admin.collection('fbclid').doc(fbclId_0).delete();
                await guest.collection('fbclid').doc(fbclId_0).set(toUpdate);

                const doc = guest.collection('fbclid').doc(fbclId_0).set(test);
                await firebase.assertFails(doc);
            }));
        });

        it(`Can update /fbclid/{fbclId} ${JSON.stringify(toUpdate)}`, async () => {
            await admin.collection('fbclid').doc(fbclId_0).delete();
            await guest.collection('fbclid').doc(fbclId_0).set(toUpdate);

            const doc = guest.collection('fbclid').doc(fbclId_0).update({
                id: fbclId_0,
                entered: 2
            });

            await firebase.assertSucceeds(doc);
        });

    });

    describe('Is disabled', () => {

        before(async () => {
            await getFirestoreAdmin().collection('users').doc(myId).set({'disabled': true});
        });

        describe(`Can't get`, () => {

            it(`/users/{userId}`, async () => {
                const doc = me.collection('users').doc(myId);
                await firebase.assertFails(doc.get());
            });

            it(`/users/{userId}/rounds/{roundId}`, async () => {
                const doc = me.collection('users').doc(myId).collection('rounds').doc(round_0);
                await firebase.assertFails(doc.get());
            });

            it(`/users/{userId}/rounds/{roundId}/today/{day}/task/{taskId}`, async () => {
                const doc = me.collection('users').doc(myId).collection('rounds').doc(round_0).collection('today').doc('mon').collection('task').doc(task_0);
                await firebase.assertFails(doc.get());
            });

            it(`/users/{userId}/rounds/{roundId}/task/{taskId}`, async () => {
                const doc = me.collection('users').doc(myId).collection('rounds').doc(round_0).collection('task').doc(task_0);
                await firebase.assertFails(doc.get());
            });

        });

        describe(`Can't list`, () => {

            it(`/users/{userId}/rounds`, async () => {
                const doc = me.collection('users').doc(myId).collection('rounds');
                await firebase.assertFails(doc.get());
            });

            it(`/users/{userId}/rounds/{roundsId}/today/{day}/task`, async () => {
                const doc = me.collection('users').doc(myId).collection('rounds').doc(round_0).collection('today').doc('mon').collection('task');
                await firebase.assertFails(doc.get());
            });

            it(`/users/{userId}/rounds/{roundsId}/today/{day}/task`, async () => {
                const doc = me.collection('users').doc(myId).collection('today').doc('mon').collection('task');
                await firebase.assertFails(doc.get());
            });

            it(`/users/{userId}/rounds/{roundsId}/task`, async () => {
                const doc = me.collection('users').doc(myId).collection('task');
                await firebase.assertFails(doc.get());
            });

        });

        it(`Can't update /users/{userId}/rounds/{roundsId}/today/{day}/task/{taskId}`, async () => {
            const doc = me.collection('users').doc(myId).collection('rounds').doc(round_0).collection('today').doc('mon').collection('task').doc(task_0);
            await firebase.assertFails(doc.set({}));
        });

    });

    describe('Is not owner, is not disabled', () => {

        before(async () => {
            await getFirestoreAdmin().collection('users').doc(myId).set({'disabled': false});
        });

        describe(`Can't get their`, () => {

            it(`/users/{userId}`, async () => {
                const doc = me.collection('users').doc(theirId);
                await firebase.assertFails(doc.get());
            });

            it(`/users/{userId}/rounds/{roundId}`, async () => {
                const doc = me.collection('users').doc(theirId).collection('rounds').doc(round_0);
                await firebase.assertFails(doc.get());
            });

            it(`/users/{userId}/rounds/{roundId}/today/{day}/task/{taskId}`, async () => {
                const doc = me.collection('users').doc(theirId).collection('rounds').doc(round_0).collection('today').doc('mon').collection('task').doc(task_0);
                await firebase.assertFails(doc.get());
            });

            it(`/users/{userId}/rounds/{roundId}/task/{taskId}`, async () => {
                const doc = me.collection('users').doc(theirId).collection('rounds').doc(round_0).collection('task').doc(task_0);
                await firebase.assertFails(doc.get());
            });

        });

        describe(`Can't list their`, () => {

            it(`/users/{userId}/rounds`, async () => {
                const doc = me.collection('users').doc(theirId).collection('rounds');
                await firebase.assertFails(doc.get());
            });

            it(`/users/{userId}/rounds/{roundsId}/today/{day}/task`, async () => {
                const doc = me.collection('users').doc(theirId).collection('rounds').doc(round_0).collection('today').doc('mon').collection('task');
                await firebase.assertFails(doc.get());
            });

            it(`/users/{userId}/rounds/{roundsId}/today/{day}/task`, async () => {
                const doc = me.collection('users').doc(theirId).collection('today').doc('mon').collection('task');
                await firebase.assertFails(doc.get());
            });

            it(`/users/{userId}/rounds/{roundsId}/task`, async () => {
                const doc = me.collection('users').doc(theirId).collection('task');
                await firebase.assertFails(doc.get());
            });
        });

        it(`Can't update their /users/{userId}/today/{day}/task/{taskId}`, async () => {
            const doc = me.collection('users').doc(theirId).collection('rounds').doc(round_0).collection('today').doc('mon').collection('task').doc(task_0);
            await firebase.assertFails(doc.set({}));
        });

    });

    describe('Is owner, is not disabled', () => {

        before(async () => {
            await admin.collection('users').doc(myId).set({'disabled': false});
        });

        it(`Can't get /users/{userId}/rounds/{roundId}/today/{day}/task/{taskId} day('other') not in ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']`, async () => {
            const doc = me.collection('users').doc(myId).collection('rounds').doc(round_0).collection('today').doc('other').collection('task').doc(task_0);
            await firebase.assertFails(doc.get());
        });

        it(`Can list /users/{userId}/rounds/{roundId}/today/{day}/task/{taskId} day in ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], orderBy.description == 'ASC', limit == 25`, async () => {
            const promises = days.map((day) =>
                me.collection('users').doc(myId).collection('rounds').doc(round_0).collection('today').doc(day).collection('task').orderBy('description', 'asc').limit(25).get());
            await firebase.assertSucceeds(Promise.all(promises));
        });

        describe(`Can't list /users/{userId}/rounds/{roundId}/today/{day}/task/{taskId}`, () => {

            it(`day('other') not in ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], orderBy.description == 'ASC', limit == 50 * 20`, async () => {
                const list = me.collection('users').doc(myId).collection('rounds').doc(round_0).collection('today').doc('other').collection('task').orderBy('description', 'asc').limit(50 * 20);
                await firebase.assertFails(list.get());
            });

            it(`day in ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], orderBy.description == 'DESC', limit == 50 * 20`, async () => {
                const promises = days.map((day) =>
                    me.collection('users').doc(myId).collection('rounds').doc(round_0).collection('today').doc(day).collection('task').orderBy('description', 'desc').limit(50 * 20).get());
                await firebase.assertFails(Promise.all(promises));
            });

            it(`day in ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], orderBy.description == 'ASC', limit(1) != 50 * 20`, async () => {
                const promises = days.map((day) =>
                    me.collection('users').doc(myId).collection('rounds').doc(round_0).collection('today').doc(day).collection('task').orderBy('description', 'asc').limit(1).get());
                await firebase.assertFails(Promise.all(promises));
            });

        });

        describe(`Can update /users/{userId}/rounds/{roundId}/today/{day}/task/{taskId}`, () => {

            describe(`/users/{userId}/rounds/{roundId}/task/{taskId} exists, timesOfDay(exists)`, () => {

                it(`{timesOfDay: true -> false}`, async () => {

                    await admin.collection('users').doc(myId).collection('rounds').doc(round_0).collection('task').doc(task_0).set({});
                    await admin.collection('users').doc(myId).collection('rounds').doc(round_0).set({
                        timesOfDay: [timeOfDay_0],
                        timesOfDayCardinality: [1]
                    });

                    await Promise.all(days.map((day) => {
                        admin.collection('users').doc(myId).collection('rounds').doc(round_0).collection('today').doc(day).collection('task').doc(task_0).set({
                            'timesOfDay': {
                                [timeOfDay_0]: true
                            }
                        })
                    }));

                    const promises = days.map((day) => {
                        return me.collection('users').doc(myId).collection('rounds').doc(round_0).collection('today').doc(day).collection('task').doc(task_0).update({
                            'timesOfDay': {
                                [timeOfDay_0]: false
                            }
                        });
                    });

                    await firebase.assertSucceeds(Promise.all(promises));

                });

            });

        });

        describe(`Can't update /users/{userId}/rounds/{roundId}/today/{day}/task/{taskId}`, () => {

            // REMOVED NOT POSSIBLE
            // timesOfDay(not exists)

            describe(`/users/{userId}/rounds/{roundId}/task/{taskId} exists`, () => {

                describe(`timesOfDay(exists)`, () => {

                    it(`timeofDay : { timeofDay_0: true }, other : { timeofDay_0: false }`, async () => {

                        await admin.collection('users').doc(myId).collection('rounds').doc(round_0).collection('task').doc(task_0).delete();
                        await admin.collection('users').doc(myId).collection('rounds').doc(round_0).set({
                            timesOfDay: [timeOfDay_0],
                            timesOfDayCardinality: [1]
                        });

                        await Promise.all(days.map((day) => {
                            admin.collection('users').doc(myId).collection('rounds').doc(round_0).collection('today').doc(day).collection('task').doc(task_0).set({
                                'timesOfDay': {
                                    [timeOfDay_0]: true
                                }
                            })
                        }));

                        const promises = days.map((day) => {
                            return me.collection('users').doc(myId).collection('rounds').doc(round_0).collection('today').doc(day).collection('task').doc(task_0).update({
                                'other': {
                                    [timeOfDay_0]: true
                                }
                            });
                        });

                        await firebase.assertFails(Promise.all(promises));

                    });

                    it(`{timesOfDay: true -> true}`, async () => {

                        await admin.collection('users').doc(myId).collection('rounds').doc(round_0).collection('task').doc(task_0).set({});
                        await admin.collection('users').doc(myId).collection('rounds').doc(round_0).set({
                            timesOfDay: [timeOfDay_0],
                            timesOfDayCardinality: [1]
                        });

                        await Promise.all(days.map((day) => {
                            admin.collection('users').doc(myId).collection('rounds').doc(round_0).collection('today').doc(day).collection('task').doc(task_0).set({
                                'timesOfDay': {
                                    [timeOfDay_0]: true
                                }
                            })
                        }));

                        const promises = days.map((day) => {
                            return me.collection('users').doc(myId).collection('rounds').doc(round_0).collection('today').doc(day).collection('task').doc(task_0).update({
                                'timesOfDay': {
                                    [timeOfDay_0]: true
                                }
                            });
                        });

                        await firebase.assertFails(Promise.all(promises));

                    });

                    it(`{timesOfDay_0: true -> false, timesOfDay_1: true -> false}`, async () => {

                        await admin.collection('users').doc(myId).collection('rounds').doc(round_0).collection('task').doc(task_0).set({});
                        await admin.collection('users').doc(myId).collection('rounds').doc(round_0).set({
                            timesOfDay: [timeOfDay_0, timeOfDay_1],
                            timesOfDayCardinality: [1, 1]
                        });

                        await Promise.all(days.map((day) => {
                            admin.collection('users').doc(myId).collection('rounds').doc(round_0).collection('today').doc(day).collection('task').doc(task_0).set({
                                'timesOfDay': {
                                    [timeOfDay_0]: true,
                                    [timeOfDay_1]: true
                                }
                            })
                        }));

                        const promises = days.map((day) => {
                            return me.collection('users').doc(myId).collection('rounds').doc(round_0).collection('today').doc(day).collection('task').doc(task_0).update({
                                'timesOfDay': {
                                    [timeOfDay_0]: false,
                                    [timeOfDay_1]: false
                                }
                            });
                        });

                        await firebase.assertFails(Promise.all(promises));

                    });

                    it(`{timesOfDay_0: true} {timesOfDay_1: false}`, async () => {

                        await admin.collection('users').doc(myId).collection('rounds').doc(round_0).collection('task').doc(task_0).set({});
                        await admin.collection('users').doc(myId).collection('rounds').doc(round_0).set({
                            timesOfDay: [timeOfDay_0, timeOfDay_1],
                            timesOfDayCardinality: [1, 1]
                        });

                        await Promise.all(days.map((day) => {
                            admin.collection('users').doc(myId).collection('rounds').doc(round_0).collection('today').doc(day).collection('task').doc(task_0).set({
                                'timesOfDay': {
                                    [timeOfDay_0]: true
                                }
                            })
                        }));

                        const promises = days.map((day) => {
                            return me.collection('users').doc(myId).collection('rounds').doc(round_0).collection('today').doc(day).collection('task').doc(task_0).update({
                                'timesOfDay': {
                                    [timeOfDay_1]: false
                                }
                            });
                        });

                        await firebase.assertFails(Promise.all(promises));

                    });

                    it(`{timesOfDay_0: true -> 'false'}`, async () => {

                        await admin.collection('users').doc(myId).collection('rounds').doc(round_0).collection('task').doc(task_0).set({});
                        await admin.collection('users').doc(myId).collection('rounds').doc(round_0).set({
                            timesOfDay: [timeOfDay_0],
                            timesOfDayCardinality: [1]
                        });

                        await Promise.all(days.map((day) => {
                            admin.collection('users').doc(myId).collection('rounds').doc(round_0).collection('today').doc(day).collection('task').doc(task_0).set({
                                'timesOfDay': {
                                    [timeOfDay_0]: true
                                }
                            })
                        }));

                        const promises = days.map((day) => {
                            return me.collection('users').doc(myId).collection('rounds').doc(round_0).collection('today').doc(day).collection('task').doc(task_0).update({
                                'timesOfDay': {
                                    [timeOfDay_0]: 'false'
                                }
                            });
                        });

                        await firebase.assertFails(Promise.all(promises));

                    });

                });

            });

            it(`/users/{userId}/rounds/{roundId}/task/{taskId} not exists, timesOfDay(exists)`, async () => {

                await admin.collection('users').doc(myId).collection('rounds').doc(round_0).collection('task').doc(task_0).delete();
                await admin.collection('users').doc(myId).collection('rounds').doc(round_0).set({
                    timesOfDay: [timeOfDay_0],
                    timesOfDayCardinality: [1]
                });

                await Promise.all(days.map((day) => {
                    admin.collection('users').doc(myId).collection('rounds').doc(round_0).collection('today').doc(day).collection('task').doc(task_0).set({
                        'timesOfDay': {
                            [timeOfDay_0]: true
                        }
                    })
                }));

                const promises = days.map((day) => {
                    return me.collection('users').doc(myId).collection('rounds').doc(round_0).collection('today').doc(day).collection('task').doc(task_0).update({
                        'timesOfDay': {
                            [timeOfDay_0]: true
                        }
                    });
                });

                await firebase.assertFails(Promise.all(promises));

            });

        });

        describe(`Can't get /users/{userId}/rounds`, async () => {

            it(`empty query params`, async () => {
                const doc = me.collection('users').doc(myId).collection('rounds').get();
                await firebase.assertFails(doc);
            });

            it(`orderBy.description == 'ASC'`, async () => {
                const doc = me.collection('users').doc(myId).collection('rounds').orderBy('description', 'asc').get();
                await firebase.assertFails(doc);
            });

            it(`orderBy.description == 'DESC'`, async () => {
                const doc = me.collection('users').doc(myId).collection('rounds').orderBy('description', 'desc').get();
                await firebase.assertFails(doc);
            });

            it(`limit == 50`, async () => {
                const doc = me.collection('users').doc(myId).collection('rounds').limit(50).get();
                await firebase.assertFails(doc);
            });

            it(`orderBy.description == 'DESC', limit == 50`, async () => {
                const doc = me.collection('users').doc(myId).collection('rounds').orderBy('description', 'desc').limit(50).get();
                await firebase.assertFails(doc);
            });

        });

        it(`Can get /users/{userId}/rounds/{roundId}/task/{taskId}`, async () => {
            const doc = me.collection('users').doc(myId).collection('rounds').doc(round_0).collection('task').doc(task_0).get();
            await firebase.assertSucceeds(doc);
        });

        describe(`Can't list /users/{userId}/rounds/{roundId}/task`, () => {

            it(`empty query params`, async () => {
                const doc = me.collection('users').doc(myId).collection('rounds').doc(round_0).collection('task').get();
                await firebase.assertFails(doc);
            });

            it(`orderBy.description == 'ASC'`, async () => {
                const doc = me.collection('users').doc(myId).collection('rounds').doc(round_0).collection('task').orderBy('description', 'asc').get();
                await firebase.assertFails(doc);
            });

            it(`orderBy.description == 'DESC'`, async () => {
                const doc = me.collection('users').doc(myId).collection('rounds').doc(round_0).collection('task').orderBy('description', 'desc').get();
                await firebase.assertFails(doc);
            });

            it(`limit == 50`, async () => {
                const doc = me.collection('users').doc(myId).collection('rounds').doc(round_0).collection('task').limit(50).get();
                await firebase.assertFails(doc);
            });

            it(`orderBy.description == 'DESC', limit == 50`, async () => {
                const doc = me.collection('users').doc(myId).collection('rounds').doc(round_0).collection('task').orderBy('description', 'desc').limit(50).get();
                await firebase.assertFails(doc);
            });

        });

        it(`Can list /users/{userId}/rounds/{roundId}/task orderBy.description == 'ASC', limit == 25`, async () => {
            const doc = me.collection('users').doc(myId).collection('rounds').doc(round_0).collection('task').orderBy('description', 'asc').limit(25).get();
            await firebase.assertSucceeds(doc);
        });

        it(`Can list /users/{userId}/rounds orderBy.name == 'ASC', limit == 5`, async () => {
            const doc = me.collection('users').doc(myId).collection('rounds').orderBy('name', 'asc').limit(5).get();
            await firebase.assertSucceeds(doc);
        });

    });

});
