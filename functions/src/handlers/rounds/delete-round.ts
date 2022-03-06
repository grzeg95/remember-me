import {firestore} from 'firebase-admin';
import {CallableContext} from 'firebase-functions/lib/providers/https';
import {Today} from '../../helpers/models';
import {testRequirement} from '../../helpers/test-requirement';
import {getUser, writeUser} from '../../helpers/user';
import {decrypt, decryptRound, decryptSymmetricKey, decryptToday, encrypt, getCryptoKey} from '../../security/security';

const app = firestore();

export const handler = (roundId: any, context: CallableContext): Promise<{ [key: string]: string }> => {

  // without app check
  testRequirement(!context.app);

  // not logged in
  testRequirement(!context.auth);

  // roundId is not empty string
  testRequirement(typeof roundId !== 'string' || roundId.length === 0);

  const auth: { uid: string } | undefined = context.auth;

  return app.runTransaction(async (transaction) => {

    // get crypto key
    // TODO
    let cryptoKey: CryptoKey;
    if (context.auth?.token.decryptedSymmetricKey) {
      cryptoKey = await getCryptoKey(context.auth?.token.decryptedSymmetricKey, context.auth?.uid);
    } else {
      cryptoKey = await decryptSymmetricKey(context.auth?.token.encryptedSymmetricKey, context.auth?.uid);
    }

    const userDocSnap = await getUser(app, transaction, auth?.uid as string);
    const roundsInUserDecryptPromise = decrypt(userDocSnap.data()?.rounds, cryptoKey);
    const roundDocSnap = await transaction.get(userDocSnap.ref.collection('rounds').doc(roundId));
    const roundDocSnapData = await decryptRound(roundDocSnap.data() as {value: string}, cryptoKey);

    // check if round exists
    testRequirement(!roundDocSnap.exists);

    // get all documents
    const docsToRemove: Promise<firestore.DocumentSnapshot<firestore.DocumentData>>[] = [];

    // get all tasks
    for (const taskId of roundDocSnapData.tasksIds) {
      docsToRemove.push(transaction.get(roundDocSnap.ref.collection('task').doc(taskId)));
    }

    const allTasksListOfDayRefsPromise: Promise<firestore.DocumentSnapshot<firestore.DocumentData>>[] = [];

    // get all today's
    roundDocSnapData.todaysIds.forEach((todayId) => {
      const today = roundDocSnap.ref.collection('today').doc(todayId);
      allTasksListOfDayRefsPromise.push(today.get());
      docsToRemove.push(transaction.get(today));
    });

    const decryptTodaysPromise = [];
    const allTasksListOfDayRefs = await Promise.all(allTasksListOfDayRefsPromise);
    for (const todaySnap of allTasksListOfDayRefs) {
      decryptTodaysPromise.push(decryptToday(todaySnap.data() as {value: string}, cryptoKey));
    }

    const decryptedTodays = await Promise.all(decryptTodaysPromise);
    for (const [i, todaySnap] of allTasksListOfDayRefs.entries()) {
      const today: Today = decryptedTodays[i];

      today.tasksIds.forEach((todayTaskId) => {
        docsToRemove.push(transaction.get(todaySnap.ref.collection('task').doc(todayTaskId)))
      });
    }

    // remove all documents
    (await Promise.all(docsToRemove)).forEach((doc) => {
      transaction.delete(doc.ref);
    });
    transaction.delete(roundDocSnap.ref);

    // update user
    const roundsInUser: string[] = userDocSnap.data()?.rounds ? JSON.parse(await roundsInUserDecryptPromise) as string[] : [];
    const roundIndexInUser = roundsInUser.indexOf(roundId);

    testRequirement(roundIndexInUser === -1);
    roundsInUser.splice(roundIndexInUser, 1);

    const userDataToWrite = {
      rounds: await encrypt(roundsInUser, cryptoKey)
    };
    writeUser(transaction, userDocSnap, userDataToWrite);

    return transaction;

  }).then(() => ({
    details: 'Your round has been deleted 🤭'
  }));
};
