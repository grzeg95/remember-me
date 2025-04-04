process.env.FIRESTORE_EMULATOR_HOST = 'localhost:9090';
const firebase = require('@firebase/rules-unit-testing');
const {initializeTestEnvironment} = require('@firebase/rules-unit-testing');
const fs = require('fs');

const projectId = 'remember-me-dev';
const myId = 'myId_2';
const theirId = 'theirId_2';
const myAuth = {
  uid: myId,
  email: 'myEmail_2'
};

describe('Firestore security rules tests', async () => {

  let testEnv;
  let me;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        rules: fs.readFileSync('../../firestore.rules', 'utf8'),
      },
    });

    me = testEnv.authenticatedContext(myAuth.uid, {email: myAuth.email}).firestore();
  });

  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const round_0 = 'round_0';
  const timeOfDay_0 = 'timesOfDay_0';
  const timeOfDay_1 = 'timesOfDay_1';
  const task_0 = 'task_0';

  describe('Is disabled', () => {

    before(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const admin = context.firestore();
        await admin.collection('users').doc(myId).set({'disabled': true});
      });
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
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const admin = context.firestore();
        await admin.collection('users').doc(myId).set({'disabled': false});
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

        await testEnv.withSecurityRulesDisabled(async (context) => {
          const admin = context.firestore();
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

              await testEnv.withSecurityRulesDisabled(async (context) => {
                const admin = context.firestore();

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
              });

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

                await testEnv.withSecurityRulesDisabled(async (context) => {
                  const admin = context.firestore();

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
                });

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

                await testEnv.withSecurityRulesDisabled(async (context) => {
                  const admin = context.firestore();

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

                });

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

                await testEnv.withSecurityRulesDisabled(async (context) => {
                  const admin = context.firestore();

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
                });

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

                await testEnv.withSecurityRulesDisabled(async (context) => {
                  const admin = context.firestore();

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
                });

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

                await testEnv.withSecurityRulesDisabled(async (context) => {
                  const admin = context.firestore();

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
                });

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

            await testEnv.withSecurityRulesDisabled(async (context) => {
              const admin = context.firestore();

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

            });

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

  });
});
