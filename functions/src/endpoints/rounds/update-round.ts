import {getFirestore} from 'firebase-admin/firestore';
import {CallableRequest} from 'firebase-functions/v2/https';
import {z} from 'zod';
import {getRoundRef} from '../../models/Round';
import {getUserRef} from '../../models/User';
import {testRequirement} from '../../utils/test-requirement';
import {TransactionWrite} from '../../utils/transaction-write';

const firestore = getFirestore();

const dataSchema = z.object({
  round: z.object({
    id: z.string().min(1),
    name: z.string()
      .transform((val) => val.trim().replace(/\s{2,}/g, ' '))
      .refine((val) => val.length >= 1 && val.length <= 64)
  })
});

export const handler = async (request: CallableRequest) => {

  const auth = request.auth;

  testRequirement(!auth, {code: 'permission-denied'});

  const dataSchemaValidationResult = dataSchema.safeParse(request.data);
  testRequirement(!!dataSchemaValidationResult.error, {code: 'invalid-argument'});
  const data = dataSchemaValidationResult.data!;

  return firestore.runTransaction(async (transaction) => {

    const transactionWrite = new TransactionWrite(transaction);

    const userRef= getUserRef(firestore, auth!.uid);

    const roundRef = getRoundRef(userRef, data.round.id);
    const roundSnap = await transaction.get(roundRef);
    testRequirement(!roundSnap.exists, {code: 'invalid-argument'});

    const round = roundSnap.data()!;

    transactionWrite.set(roundSnap.ref, {
      ...round,
      name: data.round.name,
    });

    await transactionWrite.execute();

    return {
      details: 'Your round has been created 😉'
    };
  });
};
