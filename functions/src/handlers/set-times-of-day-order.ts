import {firestore} from 'firebase-admin';
import {CallableContext, HttpsError} from 'firebase-functions/lib/providers/https';
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

  if (dir === 1) {
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

  if (dir === 1 && b.data.next) {
    bNext = await getTimeOfDay(transaction, userDocSnap, b.data.next);
    bNextDataUpdate = {
      prev: a.ref.id
    };
  }

  if (dir === -1 && b.data.prev) {
    bPrev = await getTimeOfDay(transaction, userDocSnap, b.data.prev);
    bPrevDataUpdate = {
      next: a.ref.id
    };
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
 * @param data: { dir: -1 or 1, [is, was]: not empty string and trim().length === length, was !== is }
 * @param context CallableContext
 * @return Promise<{ [key: string]: string }>
 **/
export const handler = async (data: any, context: CallableContext) => {

  // not logged in
  testRequirement(!context.auth, 'Please login in');

  // data
  testRequirement(
    data === null || !['dir', 'is', 'was'].toSet().hasOnly(Object.keys(data).toSet()) ||
    (data.dir !== -1 && data.dir !== 1) ||
    typeof data.is !== 'string' || data.is.trim().length !== data.is.length || data.is.length === 0 ||
    typeof data.was !== 'string' || data.was.trim().length !== data.was.length || data.was.length === 0 ||
    data.is === data.was,
    'expected format: { dir: -1 or 1, [is, was]: not empty string and trim().length === length, was !== is }'
  );

  const auth: { uid: string } | undefined = context.auth;

  return app.runTransaction(async (transaction) => {

    const userDocSnap = await getUser(app, transaction, auth?.uid as string);

    /*
    * Read all data
    * */

    const wasPromiseGet = getTimeOfDay(transaction, userDocSnap, (data.was as string).decodeFirebaseSpecialCharacters().encodeFirebaseSpecialCharacters());
    const isPromiseGet = getTimeOfDay(transaction, userDocSnap, (data.is as string).decodeFirebaseSpecialCharacters().encodeFirebaseSpecialCharacters());

    const was = await wasPromiseGet;
    testRequirement(!was.exists, `timeOfDayId '${data.was}' does not exists`);

    const is = await isPromiseGet;
    testRequirement(!is.exists, `timeOfDayId '${data.is}' does not exists`);

    // siblings was <-> is
    if (was.data.next === is.ref.id && is.data.prev === was.ref.id) {
      testRequirement(data.dir === 1, 'The direction must correlate with the order change');
      await processSiblings(transaction, userDocSnap, was, is);
      return transaction;
    }

    // siblings is <-> was
    if (is.data.next === was.ref.id && was.data.prev === is.ref.id) {
      testRequirement(data.dir === -1, 'The direction must correlate with the order change');
      await processSiblings(transaction, userDocSnap, is, was);
      return transaction;
    }

    // not siblings
    await processNotSiblings(data.dir, transaction, userDocSnap, is, was);

    return transaction;

  }).then(() => ({
    details: 'Order has been updated 🙃'
  })).catch((error: HttpsError) => {
    const details = error.code === 'permission-denied' ? '' : error.details && typeof error.details === 'string' ? error.details : 'Some went wrong 🤫 Try again 🙂';
    throw new HttpsError(
      error.code,
      error.message,
      details
    );
  });

};
