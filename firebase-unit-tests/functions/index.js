process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const timesOfDayTests = require('./timesOfDayOrder.tests.json')
const admin = require('firebase-admin');
const test = require('firebase-functions-test')();
const chai = require('chai');
const expect = chai.expect;
const myFunctions = require('../../functions/lib/functions/src/index');

const setTimesOfDayOrder = test.wrap(myFunctions.setTimesOfDayOrder);

admin.initializeApp();
const firestore = admin.firestore();

const myId = 'myId';
const myAuth = {
  auth: {
    uid: myId
  }
};

const getResult = async (fn, ...args) => {
  try {
    return await fn(...args);
  } catch (error) {
    return {
      code: error.code,
      message: error.message,
      details: error.details
    };
  }
};

const getTimeOfDayRef = (timeOfDayId) => {
  return firestore.collection('users').doc(myId).collection('timesOfDay').doc(timeOfDayId);
};

const setTimesOfDay = async (timesOfDay) => {
  const promises = [];

  Object.getOwnPropertyNames(timesOfDay).forEach((timeOfDay) => {
    promises.push(getTimeOfDayRef(timeOfDay).set(timesOfDay[timeOfDay]));
  });

  return await Promise.all(promises);
};

const deleteTimesOfDay = async () => {
  const promises = [];

  (await (firestore.collection('users').doc(myId).collection('timesOfDay').listDocuments())).forEach((doc) => {
    promises.push(doc.delete());
  });

  return await Promise.all(promises);
};

const getTimesOfDay = async (timesOfDay) => {
  return (await Promise.all((timesOfDay.map((timeOfDay) => getTimeOfDayRef(timeOfDay).get()))))
    .map((doc) => ({[doc.id]: doc.data()}))
    .reduce((acc, curr) => ({...acc, ...curr}), {});
};

const createTimesOfDayMockup = (timesOfDay) => {

  if (timesOfDay.length === 1) {
    return {[timesOfDay[0]]: {prev: null, next: null, counter: 1}};
  }

  if (timesOfDay.length === 2) {
    return {
      [timesOfDay[0]]: {prev: null, next: timesOfDay[1], counter: 1},
      [timesOfDay[1]]: {prev: timesOfDay[0], next: null, counter: 1}
    };
  }

  let prev = null;
  const mockup = {};

  let i = 0
  for (; i < timesOfDay.length - 1; ++i) {
    mockup[timesOfDay[i]] = {prev, next: timesOfDay[i + 1], counter: 1};
    prev = timesOfDay[i];
  }
  mockup[timesOfDay[i]] = {prev: timesOfDay[i - 1], next: null, counter: 1};

  return mockup;
};

describe(`My functions tests`, () => {

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

      describe(`data param format is wrong`, () => {

        const expected = {
          code: 'invalid-argument',
          message: 'Bad Request',
          details: 'expected format: { dir: -1 or 1, [is, was]: not empty string, was !== is }'
        };

        timesOfDayTests.authenticated['invalid argument'].forEach((test) => it(`${JSON.stringify(test)}`, async () => {
          const result = await getResult(setTimesOfDayOrder, test, myAuth);
          expect(result).to.eql(expected);
        }));

      });

      it(`{was: a} and {is: b} does not exist`, async () => {
        await deleteTimesOfDay();
        const result = await getResult(setTimesOfDayOrder, {dir: 1, was: 'a', is: 'b'}, myAuth);
        expect(result).to.eql({
          code: 'invalid-argument',
          message: 'Bad Request',
          details: `timeOfDayId 'a' does not exists`
        });
      });

      it(`{was: a} exists, {is: b} does not exist`, async () => {
        await deleteTimesOfDay();
        await setTimesOfDay(createTimesOfDayMockup(['a']));
        const result = await getResult(setTimesOfDayOrder, {dir: 1, was: 'a', is: 'b'}, myAuth);
        expect(result).to.eql({
          code: 'invalid-argument',
          message: 'Bad Request',
          details: `timeOfDayId 'b' does not exists`
        });
      });

      timesOfDayTests.authenticated['valid argument'].forEach((test) => it(`f('${test.from}', {dir: ${test.args.dir}, is: '${test.args.is}', was: '${test.args.was}'}) = '${test.to}' => ${test.expected.details}`, async () => {
        await deleteTimesOfDay();
        await setTimesOfDay(createTimesOfDayMockup(test.from.split('')));
        const result = await getResult(setTimesOfDayOrder, test.args, myAuth);
        expect(result).to.eql(test.expected);
        expect(createTimesOfDayMockup(test.to.split(''))).to.eql(await getTimesOfDay(test.from.split('')));
      }));

    });

  });

});
