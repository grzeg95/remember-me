const {
  removeUser,
  getResult,
  saveRound,
  myContext,
  saveTask,
  getRandomTimesOfDay,
  getRandomDaysOfTheWeek,
  getRandomDescription,
  getUserJsonEncrypted, insertUser, deleteTask, runTimes, median, avg
} = require('../../../index');

const myId = myContext.auth.uid;

describe(`deleteTask`, async function () {

  this.timeout(100000);

  // create 10 rounds
  // fill with 20 random tasks

  const rounds = {};
  let user;

  before(async () => {
    console.log('removeUser');
    await removeUser(myId);

    for (let i = 0; i < 1; ++i) {
      console.log(`round: ${i}`);
      const roundId = (await getResult(saveRound, {
        ...myContext,
        data: {
          roundId: 'null',
          name: 'testowy'
        }
      })).roundId;

      rounds[roundId] = [];

      for (let j = 0; j < 20; ++j) {
        const task = (await getResult(saveTask, {
          ...myContext,
          data: {
            task: {
              timesOfDay: getRandomTimesOfDay(),
              daysOfTheWeek: getRandomDaysOfTheWeek(),
              description: getRandomDescription()
            },
            taskId: "null",
            roundId
          }
        }));

        rounds[roundId].push(task.taskId);
      }
    }

    // get user
    console.log('getUserJsonEncrypted');
    user = await getUserJsonEncrypted(myId);
  });

  for (let i = 0; i < 15; ++i) {
    it(`run`, async () => {
      await removeUser(myId);
      await insertUser(user);

      // delete all task for each round
      for (const roundId of Object.getOwnPropertyNames(rounds)) {
        for (const taskId of rounds[roundId]) {
          await getResult(deleteTask, {
            ...myContext,
            data: {taskId, roundId}
          });
        }
      }
    });
  }

  after(() => {
    const runTime = runTimes['deleteTask'].runTimes;
    console.log('---------------------------');
    console.log(`deleteTask`);
    console.log(`cnt   : ${runTime.length}`);
    console.log(`median: ${median(runTime)}`);
    console.log(`avg   : ${avg(runTime)}`);
  });

});
