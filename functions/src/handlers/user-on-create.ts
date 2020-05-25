import {auth, firestore} from 'firebase-admin';
import {UserRecord} from 'firebase-functions/lib/providers/auth';

const app = firestore();

export const handler = (user: UserRecord) => {

  return app.collection('developers').where('email', '==', user.email).limit(1).get().then((querySnapDocData) => {
    if (querySnapDocData.size === 0) {
      return auth().deleteUser(user.uid).then(() => {
        return {
          message: `Permission denied for ${user.email}. Call admin.`
        };
      }).catch(() => {
        return {
          message: `This should fork fine. Call admin.`
        }
      });
    }
    return {
      message: `Welcome ${user.email}`
    };
  });

};
