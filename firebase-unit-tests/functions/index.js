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

        it(`{ dir: -1, is: 'a', was: 'a' }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: -1, is: 'a', was: 'a' }, myAuth);
          expect(result).to.eql(expected);
        });

        it(`{ dir: -2, is: 'a', was: 'b' }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: -2, is: 'a', was: 'b' }, myAuth);
          expect(result).to.eql(expected);
        });

        it(`{ dir: 2, is: 'a', was: 'b' }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: 2, is: 'a', was: 'b' }, myAuth);
          expect(result).to.eql(expected);
        });


      });

      describe(`siblings [a, b]`, () => {

        before(async () => {
          await deleteTimesOfDay();
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
          await setTimesOfDay({a: {prev: null, next: null, counter: 1}});
          const result = await getResult(setTimesOfDayOrder,{ dir: 1, is: 'a', was: 'b' }, myAuth);
          expect(result).to.eql({
            code: 'invalid-argument',
            message: 'Bad Request',
            details: `timeOfDayId 'b' does not exists`
          });
        });

        it(`not possible { dir: 1, is: 'a', was: 'b' }`, async () => {

          await setTimesOfDay({
            a: {prev: null, next: 'b', counter: 1},
            b: {prev: 'a', next: null, counter: 1}
          });

          const result = await getResult(setTimesOfDayOrder,{ dir: 1, is: 'a', was: 'b' }, myAuth);
          expect(result).to.eql({
            'code': 'invalid-argument',
            'details': 'The direction must correlate with the order change',
            'message': 'Bad Request'
          });
        });

        it(`possible { dir: -1, is: 'a', was: 'b' }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: -1, is: 'a', was: 'b' }, myAuth);
          expect(result).to.eql({
            details: 'Order has been updated 🙃'
          });

          expect({
            a: { counter: 1, next: null, prev: 'b' },
            b: { counter: 1, next: 'a', prev: null }
          }).to.eql(await getTimesOfDay(['a', 'b']));
        });

        it(`not possible { dir: -1, is: 'a', was: 'b' }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: -1, is: 'a', was: 'b' }, myAuth);
          expect(result).to.eql({
            'code': 'invalid-argument',
            'details': 'The direction must correlate with the order change',
            'message': 'Bad Request'
          });
        });

        it(`possible { dir: 1, is: 'a', was: 'b' }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: 1, is: 'a', was: 'b' }, myAuth);
          expect(result).to.eql({
            details: 'Order has been updated 🙃'
          });

          expect({
            a: { counter: 1, next: 'b', prev: null },
            b: { counter: 1, next: null, prev: 'a' }
          }).to.eql(await getTimesOfDay(['a', 'b']));
        });

        it(`not possible { dir: 1, is: 'a', was: 'b' }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: 1, is: 'a', was: 'b' }, myAuth);
          expect(result).to.eql({
            'code': 'invalid-argument',
            'details': 'The direction must correlate with the order change',
            'message': 'Bad Request'
          });
        });

      });

      describe(`siblings prev,next [a, b], c`, () => {

        before(async () => {
          await deleteTimesOfDay();
          await setTimesOfDay({
            a: {prev: null, next: 'b', counter: 1},
            b: {prev: 'a', next: 'c', counter: 1},
            c: {prev: 'b', next: null, counter: 1}
          });
        });

        it(`not possible { dir: 1, is: 'a', was: 'b' }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: 1, is: 'a', was: 'b' }, myAuth);
          expect(result).to.eql({
            'code': 'invalid-argument',
            'details': 'The direction must correlate with the order change',
            'message': 'Bad Request'
          });
        });

        it(`possible { dir: -1, is: 'a', was: 'b' }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: -1, is: 'a', was: 'b' }, myAuth);
          expect(result).to.eql({
            details: 'Order has been updated 🙃'
          });

          expect({
            a: { counter: 1, next: 'c', prev: 'b' },
            b: { counter: 1, next: 'a', prev: null },
            c: { counter: 1, prev: 'a', next: null }
          }).to.eql(await getTimesOfDay(['a', 'b', 'c']));
        });

        it(`not possible { dir: -1, is: 'a', was: 'b' }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: -1, is: 'a', was: 'b' }, myAuth);
          expect(result).to.eql({
            'code': 'invalid-argument',
            'details': 'The direction must correlate with the order change',
            'message': 'Bad Request'
          });
        });

        it(`possible { dir: 1, is: 'a', was: 'b' }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: 1, is: 'a', was: 'b' }, myAuth);
          expect(result).to.eql({
            details: 'Order has been updated 🙃'
          });

          expect({
            a: { counter: 1, next: 'b', prev: null },
            b: { counter: 1, next: 'c', prev: 'a' },
            c: { counter: 1, prev: 'b', next: null }
          }).to.eql(await getTimesOfDay(['a', 'b', 'c']));
        });

        it(`not possible { dir: 1, is: 'a', was: 'b' }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: 1, is: 'a', was: 'b' }, myAuth);
          expect(result).to.eql({
            'code': 'invalid-argument',
            'details': 'The direction must correlate with the order change',
            'message': 'Bad Request'
          });
        });

      });

      describe(`siblings prev,next a, [b, c]`, () => {

        before(async () => {
          await deleteTimesOfDay();
          await setTimesOfDay({
            a: {prev: null, next: 'b', counter: 1},
            b: {prev: 'a', next: 'c', counter: 1},
            c: {prev: 'b', next: null, counter: 1}
          });
        });

        it(`not possible { dir: 1, is: 'b', was: 'c' }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: 1, is: 'b', was: 'c' }, myAuth);
          expect(result).to.eql({
            'code': 'invalid-argument',
            'details': 'The direction must correlate with the order change',
            'message': 'Bad Request'
          });
        });

        it(`possible { dir: -1, is: 'b', was: 'c' }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: -1, is: 'b', was: 'c' }, myAuth);
          expect(result).to.eql({
            details: 'Order has been updated 🙃'
          });

          expect({
            a: { counter: 1, next: 'c', prev: null },
            b: { counter: 1, next: null, prev: 'c' },
            c: { counter: 1, prev: 'a', next: 'b' }
          }).to.eql(await getTimesOfDay(['a', 'b', 'c']));
        });

        it(`not possible { dir: -1, is: 'b', was: 'c' }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: -1, is: 'b', was: 'c' }, myAuth);
          expect(result).to.eql({
            'code': 'invalid-argument',
            'details': 'The direction must correlate with the order change',
            'message': 'Bad Request'
          });
        });

        it(`possible { dir: 1, is: 'b', was: 'c' }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: 1, is: 'b', was: 'c' }, myAuth);
          expect(result).to.eql({
            details: 'Order has been updated 🙃'
          });

          expect({
            a: { counter: 1, next: 'b', prev: null },
            b: { counter: 1, next: 'c', prev: 'a' },
            c: { counter: 1, prev: 'b', next: null }
          }).to.eql(await getTimesOfDay(['a', 'b', 'c']));
        });

        it(`not possible { dir: 1, is: 'b', was: 'c' }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: 1, is: 'b', was: 'c' }, myAuth);
          expect(result).to.eql({
            'code': 'invalid-argument',
            'details': 'The direction must correlate with the order change',
            'message': 'Bad Request'
          });
        });

      });

      describe(`siblings prev,next a, [b, c], d`, () => {

        before(async () => {
          await deleteTimesOfDay();
          await setTimesOfDay({
            a: {prev: null, next: 'b', counter: 1},
            b: {prev: 'a', next: 'c', counter: 1},
            c: {prev: 'b', next: 'd', counter: 1},
            d: {prev: 'c', next: null, counter: 1}
          });
        });

        it(`not possible { dir: 1, is: 'b', was: 'c' }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: 1, is: 'b', was: 'c' }, myAuth);
          expect(result).to.eql({
            'code': 'invalid-argument',
            'details': 'The direction must correlate with the order change',
            'message': 'Bad Request'
          });
        });

        it(`possible { dir: -1, is: 'b', was: 'c' }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: -1, is: 'b', was: 'c' }, myAuth);
          expect(result).to.eql({
            details: 'Order has been updated 🙃'
          });

          expect({
            a: { counter: 1, next: 'c', prev: null },
            b: { counter: 1, next: 'd', prev: 'c' },
            c: { counter: 1, prev: 'a', next: 'b' },
            d: { counter: 1, next: null, prev: 'b'}
          }).to.eql(await getTimesOfDay(['a', 'b', 'c', 'd']));
        });

        it(`not possible { dir: -1, is: 'b', was: 'c' }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: -1, is: 'b', was: 'c' }, myAuth);
          expect(result).to.eql({
            'code': 'invalid-argument',
            'details': 'The direction must correlate with the order change',
            'message': 'Bad Request'
          });
        });

        it(`possible { dir: 1, is: 'b', was: 'c' }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: 1, is: 'b', was: 'c' }, myAuth);
          expect(result).to.eql({
            details: 'Order has been updated 🙃'
          });

          expect({
            a: { counter: 1, next: 'b', prev: null },
            b: { counter: 1, next: 'c', prev: 'a' },
            c: { counter: 1, prev: 'b', next: 'd' },
            d: { counter: 1, prev: 'c', next: null }
          }).to.eql(await getTimesOfDay(['a', 'b', 'c', 'd']));
        });

        it(`not possible { dir: 1, is: 'b', was: 'c' }`, async () => {
          const result = await getResult(setTimesOfDayOrder,{ dir: 1, is: 'b', was: 'c' }, myAuth);
          expect(result).to.eql({
            'code': 'invalid-argument',
            'details': 'The direction must correlate with the order change',
            'message': 'Bad Request'
          });
        });

      });

      describe(`a, b, c`, () => {

        before(async () => {
          await deleteTimesOfDay();
        });

        it(`b, c, a`, async () => {

          await setTimesOfDay({
            a: {prev: null, next: 'b', counter: 1},
            b: {prev: 'a', next: 'c', counter: 1},
            c: {prev: 'b', next: null, counter: 1}
          });

          const result = await getResult(setTimesOfDayOrder,{ dir: 1, is: 'c', was: 'a' }, myAuth);
          expect(result).to.eql({
            details: 'Order has been updated 🙃'
          });

          expect({
            a: { counter: 1, next: null, prev: 'c' },
            b: { counter: 1, next: 'c', prev: null },
            c: { counter: 1, prev: 'b', next: 'a' }
          }).to.eql(await getTimesOfDay(['a', 'b', 'c']));
        });

        it(`b, a, c`, async () => {

          await setTimesOfDay({
            a: {prev: null, next: 'b', counter: 1},
            b: {prev: 'a', next: 'c', counter: 1},
            c: {prev: 'b', next: null, counter: 1}
          });

          const result = await getResult(setTimesOfDayOrder,{ dir: -1, is: 'c', was: 'a' }, myAuth);
          expect(result).to.eql({
            details: 'Order has been updated 🙃'
          });

          expect({
            a: { counter: 1, next: 'c', prev: 'b' },
            b: { counter: 1, prev: null, next: 'a' },
            c: { counter: 1, next: null, prev: 'a' }
          }).to.eql(await getTimesOfDay(['a', 'b', 'c']));
        });

      });

      describe(`a, b, c, d`, () => {

        before(async () => {
          await deleteTimesOfDay();
        });

        it(`{ dir: 1, is: 'c', was: 'a' } -> b, c, a, d`, async () => {

          await setTimesOfDay({
            a: {prev: null, next: 'b', counter: 1},
            b: {prev: 'a', next: 'c', counter: 1},
            c: {prev: 'b', next: 'd', counter: 1},
            d: {prev: 'c', next: null, counter: 1}
          });

          const result = await getResult(setTimesOfDayOrder,{ dir: 1, is: 'c', was: 'a' }, myAuth);
          expect(result).to.eql({
            details: 'Order has been updated 🙃'
          });

          expect({
            a: { counter: 1, next: 'd', prev: 'c' },
            b: { counter: 1, next: 'c', prev: null },
            c: { counter: 1, prev: 'b', next: 'a' },
            d: { counter: 1, prev: 'a' , next: null }
          }).to.eql(await getTimesOfDay(['a', 'b', 'c', 'd']));

        });

        it(`{ dir: -1, is: 'c', was: 'a' } -> b, a, c, d`, async () => {

          await setTimesOfDay({
            a: {prev: null, next: 'b', counter: 1},
            b: {prev: 'a', next: 'c', counter: 1},
            c: {prev: 'b', next: 'd', counter: 1},
            d: {prev: 'c', next: null, counter: 1}
          });

          const result = await getResult(setTimesOfDayOrder,{ dir: -1, is: 'c', was: 'a' }, myAuth);
          expect(result).to.eql({
            details: 'Order has been updated 🙃'
          });

          expect({
            a: { counter: 1, next: 'c', prev: 'b' },
            b: { counter: 1, prev: null, next: 'a' },
            c: { counter: 1, next: 'd', prev: 'a' },
            d: { counter: 1, prev: 'c' , next: null }
          }).to.eql(await getTimesOfDay(['a', 'b', 'c', 'd']));

        });

      });

      describe(`a, b, c, d, e`, () => {

        before(async () => {
          await deleteTimesOfDay();
        });

        it(`{ dir: 1, is: 'e', was: 'a' } -> b, c, d, e, a`, async () => {

          await setTimesOfDay({
            a: {prev: null, next: 'b', counter: 1},
            b: {prev: 'a', next: 'c', counter: 2},
            c: {prev: 'b', next: 'd', counter: 3},
            d: {prev: 'c', next: 'e', counter: 4},
            e: {prev: 'd', next: null, counter: 5}
          });

          const result = await getResult(setTimesOfDayOrder,{ dir: 1, is: 'e', was: 'a' }, myAuth);
          expect(result).to.eql({
            details: 'Order has been updated 🙃'
          });

          expect({
            a: { counter: 1, next: null, prev: 'e' },
            b: { counter: 2, next: 'c', prev: null },
            c: { counter: 3, prev: 'b', next: 'd' },
            d: { counter: 4, prev: 'c' , next: 'e' },
            e: { counter: 5, prev: 'd' , next: 'a' }
          }).to.eql(await getTimesOfDay(['a', 'b', 'c', 'd', 'e']));

        });

        it(`{ dir: -1, is: 'e', was: 'a' } -> b, c, d, a, e`, async () => {

          await setTimesOfDay({
            a: {prev: null, next: 'b', counter: 1},
            b: {prev: 'a', next: 'c', counter: 2},
            c: {prev: 'b', next: 'd', counter: 3},
            d: {prev: 'c', next: 'e', counter: 4},
            e: {prev: 'd', next: null, counter: 5}
          });

          const result = await getResult(setTimesOfDayOrder,{ dir: -1, is: 'e', was: 'a' }, myAuth);
          expect(result).to.eql({
            details: 'Order has been updated 🙃'
          });

          expect({
            a: { counter: 1, next: 'e', prev: 'd' },
            b: { counter: 2, next: 'c', prev: null },
            c: { counter: 3, prev: 'b', next: 'd' },
            d: { counter: 4, prev: 'c' , next: 'a' },
            e: { counter: 5, prev: 'a' , next: null }
          }).to.eql(await getTimesOfDay(['a', 'b', 'c', 'd', 'e']));

        });

      });

    });

  });

});
