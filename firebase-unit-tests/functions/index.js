process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

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

      describe(`data param format wrong`, () => {

        const expected = {
          code: 'invalid-argument',
          message: 'Bad Request',
          details: 'data format is { dir: integer & ¬0, is: string & length !== 0, was: string & length !== 0 && ¬is }'
        };

        it(`null`, async () => {
          const result = await getResult(setTimesOfDayOrder, null, myAuth);
          expect(result).to.eql(expected);
        });

        it(`[]`, async () => {
          const result = await getResult(setTimesOfDayOrder,[], myAuth);
          expect(result).to.eql(expected);
        });

        it(`{}`, async () => {
          const result = await getResult(setTimesOfDayOrder,{}, myAuth);
          expect(result).to.eql(expected);
        });

        it(`number: 0`, async () => {
          const result = await getResult(setTimesOfDayOrder,0, myAuth);
          expect(result).to.eql(expected);
        });

        it(`string`, async () => {
          const result = await getResult(setTimesOfDayOrder,'string', myAuth);
          expect(result).to.eql(expected);
        });

        it(`{ other: null }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ other: null }, myAuth);
          expect(result).to.eql(expected);
        });

        it(`{ dir: 0 }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: 0 }, myAuth);
          expect(result).to.eql(expected);
        });

        it(`{ dir: 0.1 }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: 0.1 }, myAuth);
          expect(result).to.eql(expected);
        });

        it(`{ dir: 1, is: null }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: 1, is: null }, myAuth);
          expect(result).to.eql(expected);
        });

        it(`{ dir: 1, is: '' }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: 1, is: '' }, myAuth);
          expect(result).to.eql(expected);
        });

        it(`{ dir: 1, is: 'a' }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: 1, is: 'a' }, myAuth);
          expect(result).to.eql(expected);
        });

        it(`{ dir: 1, is: 'a', was: null }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: 1, is: 'a', was: null }, myAuth);
          expect(result).to.eql(expected);
        });

        it(`{ dir: 1, is: 'a', was: '' }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: 1, is: 'a', was: '' }, myAuth);
          expect(result).to.eql(expected);
        });

        it(`{ dir: 1, is: 'a', was: 'a' }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: 1, is: 'a', was: 'a' }, myAuth);
          expect(result).to.eql(expected);
        });

      });

      describe(`ready`, () => {

        before(async () => {
          await firestore.collection('users').doc(myId).collection('timesOfDay').doc('a').delete();
          await firestore.collection('users').doc(myId).collection('timesOfDay').doc('b').delete();
        });

        it(`a not exists, { dir: 1, is: 'a', was: 'b' }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: 1, is: 'a', was: 'b' }, myAuth);

          expect(result).to.eql({
            code: 'invalid-argument',
            message: 'Bad Request',
            details: `timeOfDayId 'a' does not exists`
          });
        });

        it(`b not exists, { dir: 1, is: 'a', was: 'b' }`, async () => {

          await firestore.collection('users').doc(myId).collection('timesOfDay').doc('a').set({
            next: null,
            prev: null,
            counter: 1
          });

          const result = await getResult(setTimesOfDayOrder,{ dir: 1, is: 'a', was: 'b' }, myAuth);
          expect(result).to.eql({
            code: 'invalid-argument',
            message: 'Bad Request',
            details: `timeOfDayId 'b' does not exists`
          });
        });

        it(`{ dir: 1, is: 'a', was: 'b' }`, async () => {

          await firestore.collection('users').doc(myId).collection('timesOfDay').doc('a').set({
            next: null,
            prev: 'b',
            counter: 1
          });

          await firestore.collection('users').doc(myId).collection('timesOfDay').doc('b').set({
            next: 'a',
            prev: null,
            counter: 1
          });

          const result = await getResult(setTimesOfDayOrder,{ dir: 1, is: 'a', was: 'b' }, myAuth);
          expect(result).to.eql({
            details: 'Order has been updated 🙃'
          });
        });

      });

    });

  });

});
