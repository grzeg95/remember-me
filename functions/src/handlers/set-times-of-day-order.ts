import {firestore} from 'firebase-admin';
import {CallableContext, HttpsError} from 'firebase-functions/lib/providers/https';
import {TimeOfDay} from '../helpers/models';
import {testRequirement} from '../helpers/test-requirement';
import '../../../global.prototype';
import {getTimeOfDay} from '../helpers/timeOfDay';
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

  if (a.data.prev) {
    aPrev = await getTimeOfDay(transaction, userDocSnap, a.data.prev);
  }

  if (b.data.next) {
    bNext = await getTimeOfDay(transaction, userDocSnap, b.data.next);
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
  let aPrev;
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
    aPrev = await getTimeOfDay(transaction, userDocSnap, a.data.prev);
  }

  if (a.data.next) {
    aNext = await getTimeOfDay(transaction, userDocSnap, a.data.next);
  }

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
  testRequirement(!context.auth);

  // data in not an object
  testRequirement(typeof data !== 'object');

  // data not hasOnly dir, is, wasIndex, was
  testRequirement(!['dir', 'is', 'was'].toSet().hasOnly(Object.keys(data).toSet()));

  // data.dir is not an integer number or is zero
  testRequirement(typeof data.dir !== 'number' || !Number.isInteger(data.dir) || data.dir === 0);

  // data.is is not an string
  testRequirement(typeof data.is !== 'string');

  // data.was is not an string
  testRequirement(typeof data.was !== 'string');

  const auth: { uid: string } | undefined = context.auth;

  return app.runTransaction(async (transaction) =>
    transaction.get(app.collection('users').doc(auth?.uid as string)).then(async (userDocSnap) => {

      const userData = userDocSnap.data();
      const isDisabled = userData?.hasOwnProperty('disabled') ? userData.disabled : false;

      if (isDisabled) {
        throw new HttpsError(
          'permission-denied',
          'This account is disabled',
          'Contact administrator to resolve this problem'
        );
      }

      /*
      * Read all data
      * */

      const a = await getTimeOfDay(transaction, userDocSnap, (data.is as string).decodeFirebaseCharacters().encodeFirebaseCharacters());
      const b = await getTimeOfDay(transaction, userDocSnap, (data.was as string).decodeFirebaseCharacters().encodeFirebaseCharacters());

      // siblings a <-> b
      if (a.data.next === b.ref.id && b.data.prev === a.ref.id) {
        await processSiblings(transaction, userDocSnap, a, b);
        return transaction;
      }

      // siblings b <-> a
      if (b.data.next === a.ref.id && a.data.prev === b.ref.id) {
        await processSiblings(transaction, userDocSnap, b, a);
        return transaction;
      }

      // not siblings
      await processNotSiblings(data.dir, transaction, userDocSnap, b, a);

      return transaction;

    })
  ).then(() => ({
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
