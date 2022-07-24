import {firestore} from 'firebase-admin';
import {UserRecord} from 'firebase-admin/lib/auth';

export const handler = async (user: UserRecord) => {

  const app = firestore();
  const bulkWriter = app.bulkWriter();

  return app.recursiveDelete(app.collection('users').doc(user.uid), bulkWriter);
};
