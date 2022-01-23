import {firestore} from 'firebase-admin';
import {CallableContext} from 'firebase-functions/lib/providers/https';
import {testRequirement} from '../../helpers/test-requirement';
import {getUser, writeUser} from '../../helpers/user';
import {decrypt} from '../../security/decrypt';
import {decryptPrivateKey} from '../../security/decrypt-private-key';
import {encrypt} from '../../security/encrypt';

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

    // get private key
    const privateKey = await decryptPrivateKey(context.auth?.token.privateKey);
    testRequirement(typeof privateKey !== 'string' || privateKey.length === 0)

    const userDocSnap = await getUser(app, transaction, auth?.uid as string);
    const roundDocSnap = await transaction.get(userDocSnap.ref.collection('rounds').doc(roundId));

    // check if round exists
    testRequirement(!roundDocSnap.exists);

    // get all documents
    const docsToRemove: Promise<firestore.DocumentSnapshot<firestore.DocumentData>>[] = [];

    // get all tasks
    const getTasksPromise = roundDocSnap.ref.collection('task').listDocuments().then((list) => {
      list.forEach((docRef) => docsToRemove.push(transaction.get(docRef)));
    });

    // get all today's
    const getAllDaysPromise = roundDocSnap.ref.collection('today').listDocuments();

    const getAllTasksListOfDay: Promise<firestore.DocumentReference<firestore.DocumentData>[]>[] = [];

    (await getAllDaysPromise).forEach((day) => {
      getAllTasksListOfDay.push(day.collection('task').listDocuments());
      docsToRemove.push(transaction.get(day));
    });

    (await Promise.all(getAllTasksListOfDay)).forEach((list) => {
      list.forEach((docRef) => docsToRemove.push(transaction.get(docRef)));
    });

    await getTasksPromise;

    // remove all documents
    (await Promise.all(docsToRemove)).forEach((doc) => {
      transaction.delete(doc.ref);
    });
    transaction.delete(roundDocSnap.ref);

    // update user
    const roundsInUser: string[] = userDocSnap.data()?.rounds ? JSON.parse(decrypt(userDocSnap.data()?.rounds, privateKey)) as string[] : [];
    const roundIndexInUser = roundsInUser.indexOf(roundId);

    testRequirement(roundIndexInUser === -1);
    roundsInUser.splice(roundIndexInUser, 1);

    const userDataToWrite = {
      rounds: encrypt(roundsInUser, privateKey)
    };
    writeUser(transaction, userDocSnap, userDataToWrite);

    return transaction;

  }).then(() => ({
    details: 'Your round has been deleted 🤭'
  }));
};
