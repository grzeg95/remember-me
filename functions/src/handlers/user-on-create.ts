import {auth, firestore} from 'firebase-admin';
import {UserRecord} from 'firebase-functions/lib/providers/auth';

const app = firestore();

export const handler = async (user: UserRecord) => {

  const { email, uid } = user;

  return app.runTransaction(async (transaction) => {

    const userDocSnapDocDataPromise = transaction.get(app.collection('users').doc(uid)).then((docSnapDocData) => docSnapDocData);

    const userIsDevDocSnapDocData = await app.collection('developers')
      .where('email', '==', email)
      .limit(1)
      .get()
      .then((querySnapDocData) => querySnapDocData);

    if (userIsDevDocSnapDocData.size === 0) {

      const authDisabledUserPromise = auth().updateUser(uid, {
        disabled: true
      });

      const updateUserPromise = transaction.create((await userDocSnapDocDataPromise).ref, {
        'disabled': true
      });

      return Promise.all([authDisabledUserPromise, updateUserPromise]).then((res) => res[1]);
    }

    return transaction.create((await userDocSnapDocDataPromise).ref, {
      'disabled': false
    });

  });

};
