process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
const {chai, test, myFunctions, getResult, myAuth, myId, firestore} = require('../index');

const expect = chai.expect;
const tests = require('./tests.json');
const setTimesOfDayOrder = test.wrap(myFunctions.setTimesOfDayOrder);

const getTimeOfDayRef = (timeOfDayId) => {
  return firestore.collection('users').doc(myId).collection('timesOfDay').doc(timeOfDayId);
};

const setTimesOfDay = async (timesOfDay) => {
  return await Promise.all(
    Object.getOwnPropertyNames(timesOfDay).map(
      (timeOfDay) => getTimeOfDayRef(timeOfDay).set(timesOfDay[timeOfDay])
    )
  );
}

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
        details: 'expected format: { dir: -1 or 1, [is, was]: not empty string and trim().length === length, was !== is }'
      };

      tests.authenticated['invalid argument'].shuffle().forEach((test) => it(`${JSON.stringify(test)}`, async () => {
        const result = await getResult(setTimesOfDayOrder, test, myAuth);
        expect(result).to.eql(expected);
      }));
    });

    describe(`valid argument`, () => {
      tests.authenticated['valid argument'].shuffle().forEach((test) => it(`f('${test.from}', {dir: ${test.args.dir}, is: '${test.args.is}', was: '${test.args.was}'}) = '${test.to}' => ${test.expected.details}`, async () => {
        await deleteTimesOfDay();
        await setTimesOfDay(createTimesOfDayMockup(test.from.split('')));
        const result = await getResult(setTimesOfDayOrder, test.args, myAuth);
        expect(result).to.eql(test.expected);
        expect(createTimesOfDayMockup(test.to.split(''))).to.eql(await getTimesOfDay(test.from.split('')));
      }));
    });

  });

});
