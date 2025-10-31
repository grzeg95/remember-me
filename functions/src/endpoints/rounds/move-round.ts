import {getFirestore} from 'firebase-admin/firestore';
import {CallableRequest} from 'firebase-functions/v2/https';
import {z} from 'zod';
import {getRoundRef} from '../../models/Round';
import {getUserRef} from '../../models/User';
import {arrayMove} from '../../utils/array-move';
import {testRequirement} from '../../utils/test-requirement';
import {TransactionWrite} from '../../utils/transaction-write';

const firestore = getFirestore();

const dataSchema = z.object({
  move: z.int(),
  round: z.object({
    id: z.string().min(1)
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

    const roundRef= getRoundRef(userSnap.ref, data.round.id);
    const roundSnap = await transaction.get(roundRef);
    testRequirement(!roundSnap.exists);

    const roundIndex = (user?.roundsIds || []).indexOf(data.round.id);

    testRequirement(roundIndex === -1);
    testRequirement(data.move > 0 && roundIndex + data.move >= (user?.roundsIds || []).length);
    testRequirement(data.move < 0 && roundIndex + data.move < 0);

    const newRoundsIds = [...(user?.roundsIds || [])];

    arrayMove(newRoundsIds, roundIndex, roundIndex + data.move);

    // update user
    transactionWrite.set(userSnap.ref, {
      ...user,
      roundsIds: newRoundsIds
    });

    await transactionWrite.execute();

    return {
      details: 'Order has been updated 🙃'
    };
  });
};
