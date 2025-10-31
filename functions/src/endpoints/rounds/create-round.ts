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
    const userSnap = await transaction.get(userRef);
    const user = userSnap.data();

    testRequirement((user?.roundsIds || []).length >= 5, {details: 'You can own 5 rounds 🤔'});

    const roundRef = getRoundRef(userRef);
    const roundSnap = await transaction.get(roundRef);

    transactionWrite.set(roundSnap.ref, {
      name: data.round.name,
      tasksIds: [],
      timesOfDay: [],
      timesOfDayCardinality: []
    });

    const newRoundsIds = [...(user?.roundsIds || [])];
    newRoundsIds.push(roundSnap.id);

    transactionWrite.set(userSnap.ref, {
      ...user,
      roundsIds: newRoundsIds
    });

    await transactionWrite.execute();

    return {
      details: 'Your round has been created 😉',
      round: {
        id: roundSnap.id
      }
    };
  });
};
