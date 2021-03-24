const firebase = require('@firebase/rules-unit-testing');

const projectId = 'remember-me-dev';
const myId = 'myId';
const theirId = 'theirId';
const myAuth = {
  uid: myId,
  email: 'myEmail'
};

const getFirestore = (auth) => firebase.initializeTestApp({projectId, auth}).firestore();
const getFirestoreAdmin = () => firebase.initializeAdminApp({projectId}).firestore();

describe('Firestore security rules tests', () => {

  const me = getFirestore(myAuth);
  const admin = getFirestoreAdmin();
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const timeOfDay_0 = 'timesOfDay_0';
  const timeOfDay_1 = 'timesOfDay_1';
  const task_0 = 'task_0';

  describe('Is disabled', () => {

    before(async () => {
      await getFirestoreAdmin().collection('users').doc(myId).set({'disabled': true});
    });

    describe(`Can't get`, () => {

      it(`/users/{userId}`, async () => {
        const doc = me.collection('users').doc(myId);
        await firebase.assertFails(doc.get());
      });

      it(`/users/{userId}/today/{day}/task/{taskId}`, async () => {
        const doc = me.collection('users').doc(myId).collection('today').doc('mon').collection('task').doc(task_0);
        await firebase.assertFails(doc.get());
      });

      it(`/task/{taskId}`, async() => {
        const doc = me.collection('users').doc(myId).collection('task').doc(task_0);
        await firebase.assertFails(doc.get());
      });

    });

    describe(`Can't list`, () => {

      it(`/users/{userId}/today/{day}/task`, async () => {
        const doc = me.collection('users').doc(myId).collection('today').doc('mon').collection('task');
        await firebase.assertFails(doc.get());
      });

      it(`/users/{userId}/task`, async () => {
        const doc = me.collection('users').doc(myId).collection('task');
        await firebase.assertFails(doc.get());
      });

      it(`/users/{userId}/task/{taskId}`, async () => {
        const doc = me.collection('users').doc(myId).collection('task').doc(task_0);
        await firebase.assertFails(doc.get());
      });

    });

    it(`Can't update /users/{userId}/today/{day}/task/{taskId}`, async () => {
      const doc = me.collection('users').doc(myId).collection('today').doc('mon').collection('task').doc(task_0);
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

      it(`/users/{userId}/today/{day}/task/{taskId}`, async () => {
        const doc = me.collection('users').doc(theirId).collection('today').doc('mon').collection('task').doc(task_0);
        await firebase.assertFails(doc.get());
      });

    });

    describe(`Can't list their`, () => {

      it(`/users/{userId}/today/{day}/task`, async () => {
        const doc = me.collection('users').doc(theirId).collection('today').doc('mon').collection('task');
        await firebase.assertFails(doc.get());
      });

      it(`/users/{userId}/task`, async () => {
        const doc = me.collection('users').doc(theirId).collection('task');
        await firebase.assertFails(doc.get());
      });

      it(`/users/{userId}/task/{taskId}`, async () => {
        const doc = me.collection('users').doc(theirId).collection('task').doc(task_0);
        await firebase.assertFails(doc.get());
      });
    });

    it(`Can't update their /users/{userId}/today/{day}/task/{taskId}`, async () => {
      const doc = me.collection('users').doc(theirId).collection('today').doc('mon').collection('task').doc(task_0);
      await firebase.assertFails(doc.set({}));
    });

  });

  describe('Is owner, is not disabled', () => {

    before(async () => {
      await admin.collection('users').doc(myId).set({'disabled': false});
    });

    it(`Can't get /users/{userId}/today/{day}/task/{taskId} day('other') not in ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']`, async () => {
      const doc = me.collection('users').doc(myId).collection('today').doc('other').collection('task').doc(task_0);
      await firebase.assertFails(doc.get());
    });

    it(`Can list /users/{userId}/today/{day}/task/{taskId} day in ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], orderBy.description == 'ASC', limit == 50 * 20`, async () => {
      const promises = days.map((day) =>
        me.collection('users').doc(myId).collection('today').doc(day).collection('task').orderBy('description', 'asc').limit(50 * 20).get());
      await firebase.assertSucceeds(Promise.all(promises));
    });

    describe(`Can't list /users/{userId}/today/{day}/task/{taskId}`, () => {

      it(`day('other') not in ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], orderBy.description == 'ASC', limit == 50 * 20`, async () => {
        const list = me.collection('users').doc(myId).collection('today').doc('other').collection('task').orderBy('description', 'asc').limit(50 * 20);
        await firebase.assertFails(list.get());
      });

      it(`day in ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], orderBy.description == 'DESC', limit == 50 * 20`, async () => {
        const promises = days.map((day) =>
          me.collection('users').doc(myId).collection('today').doc(day).collection('task').orderBy('description', 'desc').limit(50 * 20).get());
        await firebase.assertFails(Promise.all(promises));
      });

      it(`day in ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], orderBy.description == 'ASC', limit(1) != 50 * 20`, async () => {
        const promises = days.map((day) =>
          me.collection('users').doc(myId).collection('today').doc(day).collection('task').orderBy('description', 'asc').limit(1).get());
        await firebase.assertFails(Promise.all(promises));
      });

    });

    describe(`Can update /users/{userId}/today/{day}/task/{taskId}`, () => {

      describe(`/users/{userId}/task/{taskId} exists, timesOfDay(exists)`, () => {

        it(`{timesOfDay: true -> false}`, async () => {

          await admin.collection('users').doc(myId).collection('task').doc(task_0).set({});
          await admin.collection('users').doc(myId).set({
            timesOfDay: [timeOfDay_0],
            timesOfDayCardinality: [1]
          });

          await Promise.all(days.map((day) => {
            admin.collection('users').doc(myId).collection('today').doc(day).collection('task').doc(task_0).set({
              'timesOfDay': {
                [timeOfDay_0]: true
              }
            })
          }));

          const promises = days.map((day) => {
            return me.collection('users').doc(myId).collection('today').doc(day).collection('task').doc(task_0).update({
              'timesOfDay': {
                [timeOfDay_0]: false
              }
            });
          });

          await firebase.assertSucceeds(Promise.all(promises));

        });

      });

    });

    describe(`Can't update /users/{userId}/today/{day}/task/{taskId}`, () => {

      // REMOVED NOT POSSIBLE
      // timesOfDay(not exists)

      describe(`/users/{userId}/task/{taskId} exists`, () => {

        describe(`timesOfDay(exists)`, () => {

          it(`timeofDay : { timeofDay_0: true }, other : { timeofDay_0: false }`, async () => {

            await admin.collection('users').doc(myId).collection('task').doc(task_0).delete();
            await admin.collection('users').doc(myId).set({
              timesOfDay: [timeOfDay_0],
              timesOfDayCardinality: [1]
            });

            await Promise.all(days.map((day) => {
              admin.collection('users').doc(myId).collection('today').doc(day).collection('task').doc(task_0).set({
                'timesOfDay': {
                  [timeOfDay_0]: true
                }
              })
            }));

            const promises = days.map((day) => {
              return me.collection('users').doc(myId).collection('today').doc(day).collection('task').doc(task_0).update({
                'other': {
                  [timeOfDay_0]: true
                }
              });
            });

            await firebase.assertFails(Promise.all(promises));

          });

          it(`{timesOfDay: true -> true}`, async () => {

            await admin.collection('users').doc(myId).collection('task').doc(task_0).set({});
            await admin.collection('users').doc(myId).set({
              timesOfDay: [timeOfDay_0],
              timesOfDayCardinality: [1]
            });

            await Promise.all(days.map((day) => {
              admin.collection('users').doc(myId).collection('today').doc(day).collection('task').doc(task_0).set({
                'timesOfDay': {
                  [timeOfDay_0]: true
                }
              })
            }));

            const promises = days.map((day) => {
              return me.collection('users').doc(myId).collection('today').doc(day).collection('task').doc(task_0).update({
                'timesOfDay': {
                  [timeOfDay_0]: true
                }
              });
            });

            await firebase.assertFails(Promise.all(promises));

          });

          it(`{timesOfDay_0: true -> false, timesOfDay_1: true -> false}`, async () => {

            await admin.collection('users').doc(myId).collection('task').doc(task_0).set({});
            await admin.collection('users').doc(myId).set({
              timesOfDay: [timeOfDay_0, timeOfDay_1],
              timesOfDayCardinality: [1, 1]
            });

            await Promise.all(days.map((day) => {
              admin.collection('users').doc(myId).collection('today').doc(day).collection('task').doc(task_0).set({
                'timesOfDay': {
                  [timeOfDay_0]: true,
                  [timeOfDay_1]: true
                }
              })
            }));

            const promises = days.map((day) => {
              return me.collection('users').doc(myId).collection('today').doc(day).collection('task').doc(task_0).update({
                'timesOfDay': {
                  [timeOfDay_0]: false,
                  [timeOfDay_1]: false
                }
              });
            });

            await firebase.assertFails(Promise.all(promises));

          });

          it(`{timesOfDay_0: true} {timesOfDay_1: false}`, async () => {

            await admin.collection('users').doc(myId).collection('task').doc(task_0).set({});
            await admin.collection('users').doc(myId).set({
              timesOfDay: [timeOfDay_0, timeOfDay_1],
              timesOfDayCardinality: [1, 1]
            });

            await Promise.all(days.map((day) => {
              admin.collection('users').doc(myId).collection('today').doc(day).collection('task').doc(task_0).set({
                'timesOfDay': {
                  [timeOfDay_0]: true
                }
              })
            }));

            const promises = days.map((day) => {
              return me.collection('users').doc(myId).collection('today').doc(day).collection('task').doc(task_0).update({
                'timesOfDay': {
                  [timeOfDay_1]: false
                }
              });
            });

            await firebase.assertFails(Promise.all(promises));

          });

          it(`{timesOfDay_0: true -> 'false'}`, async () => {

            await admin.collection('users').doc(myId).collection('task').doc(task_0).set({});
            await admin.collection('users').doc(myId).set({
              timesOfDay: [timeOfDay_0],
              timesOfDayCardinality: [1]
            });

            await Promise.all(days.map((day) => {
              admin.collection('users').doc(myId).collection('today').doc(day).collection('task').doc(task_0).set({
                'timesOfDay': {
                  [timeOfDay_0]: true
                }
              })
            }));

            const promises = days.map((day) => {
              return me.collection('users').doc(myId).collection('today').doc(day).collection('task').doc(task_0).update({
                'timesOfDay': {
                  [timeOfDay_0]: 'false'
                }
              });
            });

            await firebase.assertFails(Promise.all(promises));

          });

        });

      });

      it(`/users/{userId}/task/{taskId} not exists, timesOfDay(exists)`, async () => {

        await admin.collection('users').doc(myId).collection('task').doc(task_0).delete();
        await admin.collection('users').doc(myId).set({
          timesOfDay: [timeOfDay_0],
          timesOfDayCardinality: [1]
        });

        await Promise.all(days.map((day) => {
          admin.collection('users').doc(myId).collection('today').doc(day).collection('task').doc(task_0).set({
            'timesOfDay': {
              [timeOfDay_0]: true
            }
          })
        }));

        const promises = days.map((day) => {
          return me.collection('users').doc(myId).collection('today').doc(day).collection('task').doc(task_0).update({
            'timesOfDay': {
              [timeOfDay_0]: true
            }
          });
        });

        await firebase.assertFails(Promise.all(promises));

      });

    });

    it(`Can get /task/{taskId}`, async() => {
      const doc = me.collection('users').doc(myId).collection('task').doc(task_0).get();
      await firebase.assertSucceeds(doc);
    });

    describe(`Can't list /task`, () => {

      it(`empty query params`, async() => {
        const doc = me.collection('users').doc(myId).collection('task').get();
        await firebase.assertFails(doc);
      });

      it(`orderBy.description == 'ASC'`, async() => {
        const doc = me.collection('users').doc(myId).collection('task').orderBy('description', 'asc').get();
        await firebase.assertFails(doc);
      });

      it(`orderBy.description == 'DESC'`, async() => {
        const doc = me.collection('users').doc(myId).collection('task').orderBy('description', 'desc').get();
        await firebase.assertFails(doc);
      });

      it(`limit == 50`, async() => {
        const doc = me.collection('users').doc(myId).collection('task').limit(50).get();
        await firebase.assertFails(doc);
      });

      it(`orderBy.description == 'DESC', limit == 50`, async() => {
        const doc = me.collection('users').doc(myId).collection('task').orderBy('description', 'desc').limit(50).get();
        await firebase.assertFails(doc);
      });

    });

    it(`Can list /task orderBy.description == 'ASC', limit == 50`, async() => {
      const doc = me.collection('users').doc(myId).collection('task').orderBy('description', 'asc').limit(50).get();
      await firebase.assertSucceeds(doc);
    });

  });

});
