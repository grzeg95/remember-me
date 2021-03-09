process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
const {chai, test, myFunctions, getResult, firestore, myId, myAuth} = require('../index');

const expect = chai.expect;
const saveTask = test.wrap(myFunctions.saveTask);

const getUserJson = async (userId) => {
  let user = {};
  const userDocSnap = await firestore.collection('users').doc(userId).get();
  user = {...user, ...userDocSnap.data()}

  await firestore.collection('users').doc(userId).listCollections().then(async (collections) =>  {
    for (let collection of collections) {

      if (collection.id === 'task') {
        await firestore.collection('users').doc(userId).collection(collection.id).listDocuments().then(async (docs) => {

          for (let doc of docs) {
            if (!user['task']) {
              user['task'] = {};
            }
            user['task'][doc.id] = (await doc.get()).data();
          }
        });
      }

      if (collection.id === 'timesOfDay') {
        await firestore.collection('users').doc(userId).collection(collection.id).listDocuments().then(async (docs) => {

          for (let doc of docs) {
            if (!user['timesOfDay']) {
              user['timesOfDay'] = {};
            }
            user['timesOfDay'][doc.id] = (await doc.get()).data();
          }
        });
      }

      if (collection.id === 'today') {
        await firestore.collection('users').doc(userId).collection(collection.id).listDocuments().then(async (days) => {

          for (let day of days) {
            await firestore.collection('users').doc(userId).collection(collection.id).doc(day.id).listCollections().then(async (dayCollections) => {

              for (let dayCollection of dayCollections) {

                await firestore.collection('users').doc(userId).collection(collection.id).doc(day.id).collection(dayCollection.id).listDocuments().then(async (todayTasks) => {
                  for (let todayTask of todayTasks) {
                    if (!user[collection.id]) {
                      user[collection.id] = {};
                    }
                    if (!user[collection.id][day.id]) {
                      user[collection.id][day.id] = {};
                    }
                    if (!user[collection.id][day.id][dayCollection.id]) {
                      user[collection.id][day.id][dayCollection.id] = {};
                    }
                    user[collection.id][day.id][dayCollection.id][todayTask.id] = (await todayTask.get()).data();
                  }
                });
              }
            });

          }
        });
      }
    }
  });

  return user;
};

const removeUser = async (userId) => {
  return firestore.runTransaction(async (transaction) => {
    // read all user shit
    const stackToRemove = [];
    const stackToRead = [];

    stackToRemove.push(transaction.get(firestore.collection('users').doc(myId)).then((docSnap) => docSnap));

    stackToRead.push(firestore.collection('users').doc(userId).listCollections().then(async (collections) => {
      for (let collection of collections) {

        if (collection.id === 'task' || collection.id === 'timesOfDay') {
          stackToRead.push(firestore.collection('users').doc(userId).collection(collection.id).listDocuments().then(async (docs) => {
            for (let doc of docs) {
              stackToRemove.push(transaction.get(doc).then((docSnap) => docSnap));
            }
          }));
        }

        if (collection.id === 'today') {
          stackToRead.push(firestore.collection('users').doc(userId).collection(collection.id).listDocuments().then(async (days) => {

            for (let day of days) {
              stackToRead.push(firestore.collection('users').doc(userId).collection(collection.id).doc(day.id).listCollections().then(async (dayCollections) => {

                for (let dayCollection of dayCollections) {

                  stackToRead.push(firestore.collection('users').doc(userId).collection(collection.id).doc(day.id).collection(dayCollection.id).listDocuments().then(async (todayTasks) => {
                    for (let todayTask of todayTasks) {
                      stackToRemove.push(transaction.get(todayTask).then((docSnap) => docSnap));
                    }
                  }));
                }
              }));

            }
          }));
        }
      }

    }));

    for (const toRead of stackToRead) {
      await toRead;
    }

    for (const docToRemove of stackToRemove) {
      transaction.delete((await docToRemove).ref);
    }

  });
};

describe(`saveTask`, async () => {

  describe(`add`, async () => {
    it(`x.a + y.a = 2a`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['a'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['a'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 1,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["a"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": [
              "a"
            ]
          }
        },
        "timesOfDay": {
          "a": {
            "next": null,
            "prev": null,
            "counter": 2
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "a": false
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "a": false
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.b + y.a = 1a1b`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['b'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['a'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 2,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["b"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": [
              "a"
            ]
          }
        },
        "timesOfDay": {
          "a": {
            "counter": 1,
            "next": "b",
            "prev": null
          },
          "b": {
            "counter": 1,
            "next": null,
            "prev": "a"
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "b": false
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "a": false
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.ab + y.a = 1b2a`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['a'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 2,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["a", "b"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": [
              "a"
            ]
          }
        },
        "timesOfDay": {
          "a": {
            "counter": 2,
            "next": null,
            "prev": "b"
          },
          "b": {
            "counter": 1,
            "next": "a",
            "prev": null
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "b": false,
                  "a": false
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "a": false
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.bc + y.a = 1a1c1b`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['b', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['a'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 3,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["b", "c"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": [
              "a"
            ]
          }
        },
        "timesOfDay": {
          "a": {
            "counter": 1,
            "next": "c",
            "prev": null
          },
          "b": {
            "counter": 1,
            "next": null,
            "prev": "c"
          },
          "c": {
            "counter": 1,
            "next": "b",
            "prev": "a"
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "b": false,
                  "c": false
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "a": false
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.abc + y.a = 1c1b2a`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['a'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 3,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["a", "b", "c"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": [
              "a"
            ]
          }
        },
        "timesOfDay": {
          "a": {
            "counter": 2,
            "next": null,
            "prev": "b"
          },
          "b": {
            "counter": 1,
            "next": "a",
            "prev": "c"
          },
          "c": {
            "counter": 1,
            "next": "b",
            "prev": null
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                  "c": false
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "a": false
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.ab + y.b = 2b1a`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['b'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 2,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["a", "b"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": [
              "b"
            ]
          }
        },
        "timesOfDay": {
          "a": {
            "counter": 1,
            "next": null,
            "prev": "b"
          },
          "b": {
            "counter": 2,
            "next": "a",
            "prev": null
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "b": false,
                  "a": false
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "b": false
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.abc + y.b = 1c2b1a`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['b'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 3,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["a", "b", "c"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": [
              "b"
            ]
          }
        },
        "timesOfDay": {
          "a": {
            "counter": 1,
            "next": null,
            "prev": "b",
          },
          "b": {
            "counter": 2,
            "next": "a",
            "prev": "c",
          },
          "c": {
            "counter": 1,
            "next": "b",
            "prev": null
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "c": false,
                  "b": false,
                  "a": false
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "b": false
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.abc + y.c = 2c1b1a`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 3,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["a", "b", "c"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": [
              "c"
            ]
          }
        },
        "timesOfDay": {
          "a": {
            "counter": 1,
            "next": null,
            "prev": "b",
          },
          "b": {
            "counter": 1,
            "next": "a",
            "prev": "c",
          },
          "c": {
            "counter": 2,
            "next": "b",
            "prev": null
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "c": false,
                  "b": false,
                  "a": false
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "c": false
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.a + y.ab = 1b2a`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['a'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 2,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["a"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": ["a", "b"]
          }
        },
        "timesOfDay": {
          "a": {
            "next": null,
            "prev": "b",
            "counter": 2
          },
          "b": {
            "next": "a",
            "prev": null,
            "counter": 1
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "a": false
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.b + y.ab = 1a2b`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['b'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 2,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["b"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": ["a", "b"]
          }
        },
        "timesOfDay": {
          "a": {
            "next": "b",
            "prev": null,
            "counter": 1
          },
          "b": {
            "next": null,
            "prev": "a",
            "counter": 2
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "b": false
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.c + y.ab = 1b1a1c`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 3,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["c"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": ["a", "b"]
          }
        },
        "timesOfDay": {
          "a": {
            "next": "c",
            "prev": "b",
            "counter": 1
          },
          "b": {
            "next": "a",
            "prev": null,
            "counter": 1
          },
          "c": {
            "next": null,
            "prev": "a",
            "counter": 1
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "c": false
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.ab + y.ab = 2b2a`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 2,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["a", "b"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": [
              "a", "b"
            ]
          }
        },
        "timesOfDay": {
          "a": {
            "counter": 2,
            "next": null,
            "prev": "b"
          },
          "b": {
            "counter": 2,
            "next": "a",
            "prev": null
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "b": false,
                  "a": false
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "b": false,
                  "a": false
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.ba + y.ab = 2a2b`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['b', 'a'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 2,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["b", "a"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": ["a", "b"]
          }
        },
        "timesOfDay": {
          "a": {
            "counter": 2,
            "next": "b",
            "prev": null
          },
          "b": {
            "counter": 2,
            "next": null,
            "prev": "a"
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "b": false,
                  "a": false
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.ac + y.ab = 1b1c2a`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 3,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["a", "c"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": [
              "a", "b"
            ]
          }
        },
        "timesOfDay": {
          "a": {
            "counter": 2,
            "next": null,
            "prev": "c",
          },
          "b": {
            "counter": 1,
            "next": "c",
            "prev": null,
          },
          "c": {
            "counter": 1,
            "next": "a",
            "prev": "b"
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "c": false,
                  "a": false
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "b": false,
                  "a": false
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.bc + y.ab = 1a1c2b`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['b', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 3,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["b", "c"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": ["a", "b"]
          }
        },
        "timesOfDay": {
          "a": {
            "counter": 1,
            "next": "c",
            "prev": null
          },
          "b": {
            "counter": 2,
            "next": null,
            "prev": "c"
          },
          "c": {
            "counter": 1,
            "next": "b",
            "prev": "a"
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "b": false,
                  "c": false
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "a": false,
                  "b": false
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.abc + y.ab = 1c2b2a`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 3,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["a", "b", "c"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": ["a", "b"],
          }
        },
        "timesOfDay": {
          "a": {
            "counter": 2,
            "next": null,
            "prev": "b"
          },
          "b": {
            "counter": 2,
            "next": "a",
            "prev": "c"
          },
          "c": {
            "counter": 1,
            "next": "b",
            "prev": null
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                  "c": false
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "a": false,
                  "b": false
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.cba + y.ab = 2a2a1c`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['c', 'b', 'a'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 3,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["c","b","a"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": ["a", "b"],
          }
        },
        "timesOfDay": {
          "a": {
            "counter": 2,
            "next": "b",
            "prev": null
          },
          "b": {
            "counter": 2,
            "next": "c",
            "prev": "a"
          },
          "c": {
            "counter": 1,
            "next": null,
            "prev": "b"
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                  "c": false
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "a": false,
                  "b": false
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.abc + y.ba = 1c2b2a`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['b', 'a'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 3,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["a", "b", "c"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": ["b", "a"],
          }
        },
        "timesOfDay": {
          "a": {
            "counter": 2,
            "next": null,
            "prev": "b"
          },
          "b": {
            "counter": 2,
            "next": "a",
            "prev": "c"
          },
          "c": {
            "counter": 1,
            "next": "b",
            "prev": null
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                  "c": false
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "a": false,
                  "b": false
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.ba + y.ac = 1c2a1b`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['b', 'a'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 3,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["b", "a"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": ["a", "c"]
          }
        },
        "timesOfDay": {
          "a": {
            "counter": 2,
            "next": "b",
            "prev": "c"
          },
          "b": {
            "counter": 1,
            "next": null,
            "prev": "a"
          },
          "c": {
            "counter": 1,
            "next": "a",
            "prev": null
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "b": false,
                  "a": false
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "a": false,
                  "c": false,
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.bc + y.ac = 1a2c1b`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['b', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 3,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["b", "c"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": [
              "a", "c"
            ]
          }
        },
        "timesOfDay": {
          "a": {
            "counter": 1,
            "next": "c",
            "prev": null,
          },
          "b": {
            "counter": 1,
            "next": null,
            "prev": "c",
          },
          "c": {
            "counter": 2,
            "next": "b",
            "prev": "a"
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "b": false,
                  "c": false
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "a": false,
                  "c": false
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.abc + y.ac = 2c1b2a`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 3,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["a", "b", "c"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": ["a", "c"],
          }
        },
        "timesOfDay": {
          "a": {
            "counter": 2,
            "next": null,
            "prev": "b"
          },
          "b": {
            "counter": 1,
            "next": "a",
            "prev": "c"
          },
          "c": {
            "counter": 2,
            "next": "b",
            "prev": null
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                  "c": false
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "a": false,
                  "c": false
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.cba + y.ac = 2a1b2c`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['c', 'b', 'a'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 3,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["c","b","a"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": ["a", "c"],
          }
        },
        "timesOfDay": {
          "a": {
            "counter": 2,
            "next": "b",
            "prev": null
          },
          "b": {
            "counter": 1,
            "next": "c",
            "prev": "a"
          },
          "c": {
            "counter": 2,
            "next": null,
            "prev": "b"
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                  "c": false
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "a": false,
                  "c": false
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.abc + y.bc = 2c2b1a`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['b', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 3,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["a", "b", "c"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": ["b", "c"],
          }
        },
        "timesOfDay": {
          "a": {
            "counter": 1,
            "next": null,
            "prev": "b"
          },
          "b": {
            "counter": 2,
            "next": "a",
            "prev": "c"
          },
          "c": {
            "counter": 2,
            "next": "b",
            "prev": null
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                  "c": false
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "b": false,
                  "c": false
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.a + y.abc = 1c1b2a`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['a'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 3,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["a"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": ["a", "b", "c"]
          }
        },
        "timesOfDay": {
          "a": {
            "next": null,
            "prev": "b",
            "counter": 2
          },
          "b": {
            "next": "a",
            "prev": "c",
            "counter": 1
          },
          "c": {
            "next": "b",
            "prev": null,
            "counter": 1
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "a": false
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                  "c": false,
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.b + y.abc = 1c1a2b`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['b'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 3,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["b"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": ["a", "b", "c"]
          }
        },
        "timesOfDay": {
          "a": {
            "next": "b",
            "prev": "c",
            "counter": 1
          },
          "b": {
            "next": null,
            "prev": "a",
            "counter": 2
          },
          "c": {
            "next": "a",
            "prev": null,
            "counter": 1
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "b": false
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                  "c": false,
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.c + y.abc = 1b1a2c`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 3,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["c"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": ["a", "b", "c"]
          }
        },
        "timesOfDay": {
          "a": {
            "next": "c",
            "prev": "b",
            "counter": 1
          },
          "b": {
            "next": "a",
            "prev": null,
            "counter": 1
          },
          "c": {
            "next": null,
            "prev": "a",
            "counter": 2
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "c": false
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                  "c": false,
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.ab + y.abc = 1c2b2a`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 3,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ['a', 'b'],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": ["a", "b", "c"]
          }
        },
        "timesOfDay": {
          "a": {
            "next": null,
            "prev": "b",
            "counter": 2
          },
          "b": {
            "next": "a",
            "prev": "c",
            "counter": 2
          },
          "c": {
            "next": "b",
            "prev": null,
            "counter": 1
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                  "c": false,
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.ba + y.abc = 1c2a2b`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['b', 'a'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 3,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ['b', 'a'],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": ["a", "b", "c"]
          }
        },
        "timesOfDay": {
          "a": {
            "next": "b",
            "prev": "c",
            "counter": 2
          },
          "b": {
            "next": null,
            "prev": "a",
            "counter": 2
          },
          "c": {
            "next": "a",
            "prev": null,
            "counter": 1
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                  "c": false,
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.ac + y.abc = 1b2c2a`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 3,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ['a', 'c'],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": ["a", "b", "c"]
          }
        },
        "timesOfDay": {
          "a": {
            "next": null,
            "prev": "c",
            "counter": 2
          },
          "b": {
            "next": "c",
            "prev": null,
            "counter": 1
          },
          "c": {
            "next": "a",
            "prev": "b",
            "counter": 2
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "a": false,
                  "c": false,
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                  "c": false,
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.bc + y.abc = 1a2c2b`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['b', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 3,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ['b', 'c'],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": ["a", "b", "c"]
          }
        },
        "timesOfDay": {
          "a": {
            "next": "c",
            "prev": null,
            "counter": 1
          },
          "b": {
            "next": null,
            "prev": "c",
            "counter": 2
          },
          "c": {
            "next": "b",
            "prev": "a",
            "counter": 2
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "b": false,
                  "c": false,
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                  "c": false,
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.abc + y.abc = 2c2b2a`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 3,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ["a", "b", "c"],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": ["a", "b", "c"],
          }
        },
        "timesOfDay": {
          "a": {
            "counter": 2,
            "next": null,
            "prev": "b"
          },
          "b": {
            "counter": 2,
            "next": "a",
            "prev": "c"
          },
          "c": {
            "counter": 2,
            "next": "b",
            "prev": null
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                  "c": false
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                  "c": false
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.cba + y.abc = 2a2b2c`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['c', 'b', 'a'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 3,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ['c', 'b', 'a'],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": ["a", "b", "c"]
          }
        },
        "timesOfDay": {
          "a": {
            "next": "b",
            "prev": null,
            "counter": 2
          },
          "b": {
            "next": "c",
            "prev": "a",
            "counter": 2
          },
          "c": {
            "next": null,
            "prev": "b",
            "counter": 2
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                  "c": false,
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                  "c": false,
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.ab + y.cba = 1c2b2a`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'b'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['c', 'b', 'a'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 3,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ['a', 'b'],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": ["c", "b", "a"]
          }
        },
        "timesOfDay": {
          "a": {
            "counter": 2,
            "next": null,
            "prev": "b",
          },
          "b": {
            "counter": 2,
            "next": "a",
            "prev": "c"
          },
          "c": {
            "counter": 1,
            "next": "b",
            "prev": null
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                  "c": false,
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });

    it(`x.ac + y.cba = 1b2c2a`, async () => {
      // clear user
      await removeUser(myId);

      const x = await getResult(saveTask, {
        task: {
          timesOfDay: ['a', 'c'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0001'
        },
        taskId: 'null'
      }, myAuth);

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: x.taskId
      }).to.eql(x);

      const y = await getResult(saveTask, {
        task: {
          timesOfDay: ['c', 'b', 'a'],
          daysOfTheWeek: {
            mon: true,
            tue: false,
            wed: false,
            thu: false,
            fri: false,
            sat: false,
            sun: false
          },
          description: '0002'
        },
        taskId: 'null'
      }, myAuth);

      const mustBe = {
        "taskSize": 2,
        "timesOfDaySize": 3,
        "task": {
          [x.taskId]: {
            "description": "0001",
            "timesOfDay": ['a', 'c'],
            "daysOfTheWeek": {
              "thu": false,
              "tue": false,
              "sat": false,
              "mon": true,
              "sun": false,
              "wed": false,
              "fri": false
            }
          },
          [y.taskId]: {
            "daysOfTheWeek": {
              "fri": false,
              "mon": true,
              "sat": false,
              "sun": false,
              "thu": false,
              "tue": false,
              "wed": false
            },
            "description": "0002",
            "timesOfDay": ["c", "b", "a"]
          }
        },
        "timesOfDay": {
          "a": {
            "counter": 2,
            "next": null,
            "prev": "c"
          },
          "b": {
            "counter": 1,
            "next": "c",
            "prev": null
          },
          "c": {
            "counter": 2,
            "next": "a",
            "prev": "b"
          }
        },
        "today": {
          "mon": {
            "task": {
              [x.taskId]: {
                "description": "0001",
                "timesOfDay": {
                  "a": false,
                  "c": false,
                }
              },
              [y.taskId]: {
                "description": "0002",
                "timesOfDay": {
                  "a": false,
                  "b": false,
                  "c": false,
                }
              }
            }
          }
        }
      };

      expect({
        created: true,
        details: 'Your task has been created 😉',
        taskId: y.taskId
      }).to.eql(y);

      expect(mustBe).to.eql(await getUserJson(myId));

    });
  });

  // TODO a - b

  // TODO a with days -> LOL it's hard

});
