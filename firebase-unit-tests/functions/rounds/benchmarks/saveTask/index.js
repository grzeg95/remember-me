const {removeUser, myId, getResult, saveRound, myAuth, saveTask, runTimes, median, avg, chai} = require("../../../index");

const expect = chai.expect;

const randomBetween = (a, b) => {
  return Math.random() * (b - a) + a;
}

const daysOfTheWeek = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const timesOfDay = [
  'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'
];

const getRandomDaysOfTheWeek = () => {
  return daysOfTheWeek.shuffle().slice(0, randomBetween(1, daysOfTheWeek.length - 1));
};

const getRandomTimesOfDay = () => {
  return timesOfDay.shuffle().slice(0, randomBetween(1, timesOfDay.length - 1));
};

const getRandomDescription = () => {

  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < randomBetween(1, 255); i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return result;
};

describe(`saveTask`, async () => {

  const tasksIds = [];
  let roundId;

  before(async () => {
    await removeUser(myId);

    roundId = (await getResult(saveRound, {
      roundId: 'null',
      name: 'testowy'
    }, myAuth)).roundId;

    for (let i = 0; i < 20; ++i) {
      const taskId = (await getResult(saveTask, {
        task: {
          timesOfDay: getRandomTimesOfDay(),
          daysOfTheWeek: getRandomDaysOfTheWeek(),
          description: getRandomDescription()
        },
        taskId: "null",
        roundId
      }, myAuth)).taskId;

      tasksIds.push(taskId);
    }
  });

  for (let i = 0; i < 50; ++i) {
    it('run' , async () => {
      for (const taskId of tasksIds) {
        await getResult(saveTask, {
          task: {
            timesOfDay: getRandomTimesOfDay(),
            daysOfTheWeek: getRandomDaysOfTheWeek(),
            description: getRandomDescription()
          },
          taskId,
          roundId
        }, myAuth);

        expect(true).to.eql(true);
      }
    }).timeout(50000);
  }

  after(() => {
    for (const functionName of Object.getOwnPropertyNames(runTimes)) {
      const runTime = runTimes[functionName].runTimes;
      console.log('---------------------------');
      console.log(`${functionName}`);
      console.log(`cnt   : ${runTime.length}`);
      console.log(`median: ${median(runTime)}`);
      console.log(`avg   : ${avg(runTime)}`);
    }
  });
});
