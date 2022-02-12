import {firestore} from 'firebase-admin';
import {UserRecord} from 'firebase-admin/lib/auth';
import {EventContext} from 'firebase-functions';

export const handler = async (user: UserRecord, context: EventContext) => {

  const app = firestore();
  const bulkWriter = app.bulkWriter();

  return app.recursiveDelete(app.collection('users').doc(user.uid), bulkWriter);
}
