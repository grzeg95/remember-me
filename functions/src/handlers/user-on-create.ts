import {auth, firestore} from 'firebase-admin';
import {UserRecord} from 'firebase-functions/lib/providers/auth';

const app = firestore();

export const handler = async (user: UserRecord) => {

  const { email, uid } = user;

  const userIsDeveloper = await app
    .collection('developers')
    .where('email', '==', email)
    .limit(1)
    .get()
    .then((querySnapDocData) => querySnapDocData.size === 1);

  if (userIsDeveloper) {
    return null;
  }

  return auth().updateUser(uid, {
    disabled: true
  });

};
