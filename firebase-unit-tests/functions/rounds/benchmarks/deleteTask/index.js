const {
  removeUser,
  myId,
  getResult,
  saveRound,
  myAuth,
  saveTask,
  getRandomTimesOfDay,
  getRandomDaysOfTheWeek,
  getRandomDescription,
  getUserJsonEncrypted, insertUser, deleteTask, runTimes, median, avg
} = require('../../../index');

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
        roundId: 'null',
        name: 'testowy'
      }, myAuth)).roundId;

      rounds[roundId] = [];

      for (let j = 0; j < 20; ++j) {
        const task = (await getResult(saveTask, {
          task: {
            timesOfDay: getRandomTimesOfDay(),
            daysOfTheWeek: getRandomDaysOfTheWeek(),
            description: getRandomDescription()
          },
          taskId: "null",
          roundId
        }, myAuth));

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
          await getResult(deleteTask, {taskId, roundId}, myAuth);
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
