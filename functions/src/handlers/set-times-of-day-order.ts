import {firestore} from 'firebase-admin';
import {CallableContext} from 'firebase-functions/lib/providers/https';
import {TimeOfDay} from '../helpers/models';
import {testRequirement} from '../helpers/test-requirement';
import {getTimeOfDay} from '../helpers/timeOfDay';
import {getUser} from '../helpers/user';
import Transaction = firestore.Transaction;
import DocumentSnapshot = firestore.DocumentSnapshot;

const app = firestore();

const processSiblings = async (transaction: Transaction, userDocSnap: DocumentSnapshot, a: TimeOfDay, b: TimeOfDay): Promise<void> => {

  let aPrev;
  let aPrevDataUpdate = null;
  let bNext;
  let bNextDataUpdate = null;

  const aDataUpdate = {
    next: b.data.next,
    prev: b.ref.id
  };

  const bDataUpdate = {
    next: a.ref.id,
    prev: a.data.prev
  };

  let aPrevPromise;
  let bNextPromise;

  if (a.data.prev) {
    aPrevPromise = getTimeOfDay(transaction, userDocSnap, a.data.prev);
  }

  if (b.data.next) {
    bNextPromise = getTimeOfDay(transaction, userDocSnap, b.data.next);
  }

  if (aPrevPromise) {
    aPrev = await aPrevPromise;
  }

  if (bNextPromise) {
    bNext = await bNextPromise;
  }

  if (aPrev && aPrev.exists) {
    aPrevDataUpdate = {
      next: b.ref.id
    };
  }

  if (bNext && bNext.exists) {
    bNextDataUpdate = {
      prev: a.ref.id
    };
  }

  transaction.update(a.ref, aDataUpdate);
  transaction.update(b.ref, bDataUpdate);

  if (aPrev && aPrevDataUpdate) {
    transaction.update(aPrev.ref, aPrevDataUpdate);
  }

  if (bNext && bNextDataUpdate) {
    transaction.update(bNext.ref, bNextDataUpdate);
  }
}

const processNotSiblings = async (dir: number, transaction: Transaction, userDocSnap: DocumentSnapshot, a: TimeOfDay, b: TimeOfDay): Promise<void> => {

  let aDataUpdate;
  let bDataUpdate;
  let aNext;
  let aNextPromise;
  let aPrev;
  let aPrevPromise;
  let bNext = null;
  let bPrev = null;
  let aNextDataUpdate = null;
  let aPrevDataUpdate = null;
  let bNextDataUpdate = null;
  let bPrevDataUpdate = null;

  if (dir > 0) {
    aDataUpdate = {
      next: b.data.next,
      prev: b.ref.id
    }
    bDataUpdate = {
      next: a.ref.id
    }
  } else {
    aDataUpdate = {
      next: b.ref.id,
      prev: b.data.prev
    };
    bDataUpdate = {
      prev: a.ref.id
    };
  }

  if (a.data.prev) {
    aPrevPromise = getTimeOfDay(transaction, userDocSnap, a.data.prev);
  }

  if (a.data.next) {
    aNextPromise = getTimeOfDay(transaction, userDocSnap, a.data.next);
  }

  aPrev = await aPrevPromise;
  aNext = await aNextPromise;

  if (aNext && aNext.exists) {
    aNextDataUpdate = {
      prev: a.data.prev
    };
  }

  if (aPrev && aPrev.exists) {
    aPrevDataUpdate = {
      next: a.data.next
    };
  }

  if (dir > 0) {
    if (b.data.next) {
      bNext = await getTimeOfDay(transaction, userDocSnap, b.data.next);
    }
    if (bNext && bNext.exists) {
      bNextDataUpdate = {
        prev: a.ref.id
      };
    }
  } else {
    if (b.data.prev) {
      bPrev = await getTimeOfDay(transaction, userDocSnap, b.data.prev);
    }
    if (bPrev && bPrev.exists) {
      bPrevDataUpdate = {
        next: a.ref.id
      };
    }
  }

  transaction.update(a.ref, aDataUpdate);
  transaction.update(b.ref, bDataUpdate);

  if (aPrev && aPrevDataUpdate) {
    transaction.update(aPrev.ref, aPrevDataUpdate);
  }

  if (aNext && aNextDataUpdate) {
    transaction.update(aNext.ref, aNextDataUpdate);
  }

  if (bPrev && bPrevDataUpdate) {
    transaction.update(bPrev.ref, bPrevDataUpdate);
  }

  if (bNext && bNextDataUpdate) {
    transaction.update(bNext.ref, bNextDataUpdate);
  }

}

/**
 * @function handler
 * Set times of day order
 * @param data: {isIndex: number, is: string, wasIndex: number, was: string}
 * @param context CallableContext
 * @return Promise<{[key: string]: string}>
 **/
export const handler = (data: any, context: CallableContext): Promise<{[key: string]: string}> => {

  // not logged in
  testRequirement(!context.auth, 'Please login in');

  // data
  testRequirement(
    data === null || !['dir', 'is', 'was'].toSet().hasOnly(Object.keys(data).toSet()) ||
    (data.dir !== -1 && data.dir !== 1) ||
    typeof data.is !== 'string' || data.is.length === 0 ||
    typeof data.was !== 'string' || data.was.length === 0 ||
    data.is === data.was,
    'expected format: { dir: -1 or 1, [is, was]: not empty string, was !== is }'
  );

  const auth: { uid: string } | undefined = context.auth;

  return app.runTransaction(async (transaction) => {

    const userDocSnap = await getUser(app, transaction, auth?.uid as string);

    /*
    * Read all data
    * */

    const aPromiseGet = getTimeOfDay(transaction, userDocSnap, (data.was as string).decodeFirebaseSpecialCharacters().encodeFirebaseSpecialCharacters());
    const bPromiseGet = getTimeOfDay(transaction, userDocSnap, (data.is as string).decodeFirebaseSpecialCharacters().encodeFirebaseSpecialCharacters());

    const a = await aPromiseGet;
    testRequirement(!a.exists, `Try again time of day '${data.was}' disappear`)

    const b = await bPromiseGet;
    testRequirement(!b.exists, `Try again time of day '${data.is}' disappear`)

    // siblings a <-> b
    if (a.data.next === b.ref.id && b.data.prev === a.ref.id) {
      testRequirement(data.dir > 0, 'The direction must correlate with the order change');
      await processSiblings(transaction, userDocSnap, a, b);
      return transaction;
    }

    // siblings b <-> a
    if (b.data.next === a.ref.id && a.data.prev === b.ref.id) {
      testRequirement(data.dir < 0, 'The direction must correlate with the order change');
      await processSiblings(transaction, userDocSnap, b, a);
      return transaction;
    }

    // not siblings
    await processNotSiblings(data.dir, transaction, userDocSnap, b, a);
    return transaction;

  }).then(() => ({
    details: 'Order has been updated 🙃'
  }));

};
