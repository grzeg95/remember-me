import {getFirestore, FieldValue} from 'firebase-admin/firestore';
import {getStorage} from 'firebase-admin/storage';
import {CallableRequest} from 'firebase-functions/v2/https';
import {z} from 'zod';
import {getUserRef} from '../../models/User';
import {testRequirement} from '../../utils/test-requirement';
import {TransactionWrite} from '../../utils/transaction-write';

const dataSchema = z.null();

export const handler = async (request: CallableRequest) => {

  const auth = request.auth;

  testRequirement(!auth, {code: 'permission-denied'});

  const dataSchemaValidationResult = dataSchema.safeParse(request.data);
  testRequirement(!!dataSchemaValidationResult.error, {code: 'invalid-argument'});

  const firestoreApp = getFirestore();
  const storageApp = getStorage();

  await storageApp.bucket().file(`users/${auth!.uid}/profile.jpg`).delete();

  await firestoreApp.runTransaction(async (transaction) => {

    const transactionWrite = new TransactionWrite(transaction);

    const userRef = getUserRef(firestoreApp, auth!.uid);
    const userSnap = await transaction.get(userRef);

    transactionWrite.update(userSnap.ref, {
      photoUrl: FieldValue.delete()
    });

    await transactionWrite.execute();
  });

  return {
    details: 'Photo has been removed 🙃'
  };
};
