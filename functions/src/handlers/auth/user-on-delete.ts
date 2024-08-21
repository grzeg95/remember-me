import {getFirestore} from 'firebase-admin/firestore';
import {UserRecord} from 'firebase-admin/lib/auth';
import {EventContext} from 'firebase-functions';
import {User} from '../../models/user';

const firestore = getFirestore();

export const handler = async (user: UserRecord, context: EventContext) => {

  const eventAgeMs = Date.now() - Date.parse(context.timestamp);
  const eventMaxAgeMs = 60 * 1000;
  if (eventAgeMs > eventMaxAgeMs) {
    console.log(`Dropping event ${context.eventId} with age[ms]: ${eventAgeMs}`);
    return Promise.resolve();
  }

  const bulkWriter = firestore.bulkWriter();
  const maxRetryAttempts = 10;

  bulkWriter.onWriteError((error) => {
    if (error.failedAttempts < maxRetryAttempts) {
      return true;
    } else {
      console.log('Failed write at document: ', error.documentRef.path);
      return false;
    }
  });

  const userRef = User.ref(firestore, user.uid);
  return firestore.recursiveDelete(userRef, bulkWriter);
};
