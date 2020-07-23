import {auth, firestore} from 'firebase-admin';
import {UserRecord} from 'firebase-functions/lib/providers/auth';

const app = firestore();

export const handler = async (user: UserRecord) => {

  const {email, uid} = user;

  return app.runTransaction(async (transaction) => {

    const userDoc = transaction.get(
      app.collection('users').doc(uid)
    ).then((docSnapDocData) => docSnapDocData);

    const userIsDeveloper = (await (await app.collection('developers')
      .where('email', '==', email).limit(1).get().then((querySnap) => querySnap)
    ).docs.map((doc) => transaction.get(doc.ref))).length === 1;

    if (!userIsDeveloper) {

      const authDisabledUserPromise = auth().updateUser(uid, {
        disabled: true
      });

      const createUserPromise = transaction.create((await userDoc).ref, {
        'disabled': true
      });

      await authDisabledUserPromise;
      return createUserPromise;
    }

    return transaction.create((await userDoc).ref, {
      'disabled': false
    });

  });

};
