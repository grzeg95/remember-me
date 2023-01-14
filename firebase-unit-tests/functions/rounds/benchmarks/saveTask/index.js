const {
  chai, removeUser, getResult, saveRound, myContext, saveTask, runTimes, median, avg, getRandomTimesOfDay,
  getRandomDaysOfTheWeek, getRandomDescription
} = require('../../../index');

const myId = myContext.auth.uid;
const expect = chai.expect;

describe(`saveTask`, async function () {

  this.timeout(100000);

  const tasksIds = [];
  let roundId;

  before(async () => {
    await removeUser(myId);

    roundId = (await getResult(saveRound, {
      ...myContext,
      data: {
        roundId: 'null',
        name: 'testowy'
      }
    })).roundId;

    for (let i = 0; i < 20; ++i) {
      const taskId = (await getResult(saveTask, {
        ...myContext,
        data: {
          task: {
            timesOfDay: getRandomTimesOfDay(),
            daysOfTheWeek: getRandomDaysOfTheWeek(),
            description: getRandomDescription()
          },
          taskId: 'null',
          roundId
        }
      })).taskId;

      tasksIds.push(taskId);
    }
  });

  for (let i = 0; i < 50; ++i) {
    it('run', async () => {
      for (const taskId of tasksIds) {
        await getResult(saveTask, {
          ...myContext,
          data: {
            task: {
              timesOfDay: getRandomTimesOfDay(),
              daysOfTheWeek: getRandomDaysOfTheWeek(),
              description: getRandomDescription()
            },
            taskId,
            roundId
          }
        });

        expect(true).to.eql(true);
      }
    }).timeout(100000);
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
