import {firestore} from 'firebase-admin';
import {CallableContext, HttpsError} from 'firebase-functions/lib/providers/https';
import {testRequirement} from '../helpers/test-requirement';
import '../../../global.prototype';
import Transaction = firestore.Transaction;
import DocumentSnapshot = firestore.DocumentSnapshot;

const app = firestore();

const processSiblings = async (transaction: Transaction, userDocSnap: DocumentSnapshot, a: DocumentSnapshot, b: DocumentSnapshot): Promise<void> => {

  let aPrev;
  let aPrevDataUpdate = null;
  let bNext;
  let bNextDataUpdate = null;

  const aDataUpdate = {
    next: b.data()?.next,
    prev: b.id
  };

  const bDataUpdate = {
    next: a.id,
    prev: a.data()?.prev
  };

  let aPrevPromise;
  let bNextPromise;

  if (a.data()?.prev) {
    aPrevPromise = transaction.get(userDocSnap.ref.collection('timesOfDay').doc(a.data()?.prev)).then((docSnap) => docSnap);
  }

  if (b.data()?.next) {
    bNextPromise = transaction.get(userDocSnap.ref.collection('timesOfDay').doc(b.data()?.next)).then((docSnap) => docSnap);
  }

  aPrev = await aPrevPromise;
  aPrevPromise = undefined;

  bNext = await bNextPromise;
  bNextPromise = undefined;

  if (aPrev && aPrev.exists) {
    aPrevDataUpdate = {
      next: b.id
    };
  }

  if (bNext && bNext.exists) {
    bNextDataUpdate = {
      prev: a.id
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

const processNotSiblings = async (dir: number, transaction: Transaction, userDocSnap: DocumentSnapshot, a: DocumentSnapshot, b: DocumentSnapshot): Promise<void> => {

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
      next: b.data()?.next,
      prev: b.id
    }
    bDataUpdate = {
      next: a.id
    }
  } else {
    aDataUpdate = {
      next: b.id,
      prev: b.data()?.prev
    };
    bDataUpdate = {
      prev: a.id
    };
  }

  let aNextPromise;
  let aPrevPromise;

  if (a.data()?.next) {
    aNextPromise = transaction.get(userDocSnap.ref.collection('timesOfDay').doc(a.data()?.next)).then((docSnap) => docSnap);
  }

  if (a.data()?.prev) {
    aPrevPromise = transaction.get(userDocSnap.ref.collection('timesOfDay').doc(a.data()?.prev)).then((docSnap) => docSnap);
  }

  aNext = await aNextPromise;
  aNextPromise = undefined;

  aPrev = await aPrevPromise;
  aPrevPromise = undefined;

  if (aNext && aNext.exists) {
    aNextDataUpdate = {
      prev: a.data()?.prev
    };
  }

  if (aPrev && aPrev.exists) {
    aPrevDataUpdate = {
      next: a.data()?.next
    };
  }

  if (dir > 0) {
    if (b.data()?.next) {
      bNext = await transaction.get(userDocSnap.ref.collection('timesOfDay').doc(b.data()?.next)).then((docSnap) => docSnap);
    }
    if (bNext && bNext.exists) {
      bNextDataUpdate = {
        prev: a.id
      };
    }
  } else {
    if (b.data()?.prev) {
      bPrev = await transaction.get(userDocSnap.ref.collection('timesOfDay').doc(b.data()?.prev)).then((docSnap) => docSnap);
    }
    if (bPrev && bPrev.exists) {
      bPrevDataUpdate = {
        next: a.id
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

  // data.dir is not an number
  testRequirement(typeof data.dir !== 'number');

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

      const a = await transaction.get(userDocSnap.ref.collection('timesOfDay').doc(data.is)).then((docSnap) => docSnap);
      const b = await transaction.get(userDocSnap.ref.collection('timesOfDay').doc(data.was)).then((docSnap) => docSnap);

      // siblings a <-> b
      if (a.data()?.next === b.id && b.data()?.prev === a.id) {
        await processSiblings(transaction, userDocSnap, a, b);
        return transaction;
      }

      // siblings b <-> a
      if (b.data()?.next === a.id && a.data()?.prev === b.id) {
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
