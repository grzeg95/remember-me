import {getFirestore} from 'firebase-admin/firestore';
import {getStorage} from 'firebase-admin/storage';
import {EventContext} from 'firebase-functions/v1';
import {UserRecord} from 'firebase-functions/v1/auth';
import {getUserRef} from '../../models/User';

export const handler = async (user: UserRecord, context: EventContext) => {

  const firestore = getFirestore();

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

  const userRef = getUserRef(firestore, user.uid);
  await firestore.recursiveDelete(userRef, bulkWriter);

  const storageApp = getStorage();

  await storageApp.bucket().file(`users/${user.uid}/profile.jpg`).delete();
};
