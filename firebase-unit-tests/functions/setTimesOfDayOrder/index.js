process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
const {chai, test, myFunctions, getResult, myAuth, myId, firestore, removeUser} = require('../index');

const expect = chai.expect;
const tests = require('./tests.json');
const setTimesOfDayOrder = test.wrap(myFunctions.setTimesOfDayOrder);

describe(`setTimesOfDayOrder`, () => {

  it(`not authenticated`, async () => {

    const expected = {
      code: 'invalid-argument',
      message: 'Bad Request',
      details: 'Please login in'
    };

    const result = await getResult(setTimesOfDayOrder, null, null);

    expect(result).to.eql(expected);
  });

  describe(`authenticated`, () => {

    describe(`invalid argument`, () => {

      const expected = {
        code: 'invalid-argument',
        message: 'Bad Request',
        details: 'data is incorrect'
      };

      tests.authenticated['invalid argument'].forEach((test) => it(`${JSON.stringify(test)}`, async () => {
        const result = await getResult(setTimesOfDayOrder, test, myAuth);
        expect(result).to.eql(expected);
      }));
    });

    describe(`valid argument`, () => {
      tests.authenticated['valid argument'].forEach((test) => it(JSON.stringify(test), async () => {

        await removeUser(myId);

        const startTimesOfDay = test.from.split('');
        const startTimesOfDayCardinality = [...Array(startTimesOfDay.length).keys()].map(e => e+1);

        await firestore.collection('users').doc(myId).set({
          timesOfDay: startTimesOfDay,
          timesOfDayCardinality: startTimesOfDayCardinality
        });

        const result = await getResult(setTimesOfDayOrder, test.args, myAuth);
        expect(result).to.eql(test.expected);

        const userDocSnap = await firestore.collection('users').doc(myId).get();
        const toCompare = {
          timesOfDay: userDocSnap.data().timesOfDay,
          timesOfDayCardinality: userDocSnap.data().timesOfDayCardinality
        };

        const endTimesOfDayCardinality = test.to.split('').map((e) => startTimesOfDayCardinality[startTimesOfDay.indexOf(e)]);

        expect({
          timesOfDay: test.to.split(''),
          timesOfDayCardinality: endTimesOfDayCardinality
        }).to.eql(toCompare);
      }));
    });

  });

});
