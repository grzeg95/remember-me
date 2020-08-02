import {firestore} from 'firebase-admin';
import {CallableContext, HttpsError} from 'firebase-functions/lib/providers/https';
import {testRequirement} from '../helpers/test-requirement';
import '../../../global.prototype';
import Transaction = firestore.Transaction;
import DocumentSnapshot = firestore.DocumentSnapshot;

const app = firestore();

const processSiblings = async (transaction: Transaction, userDocSnap: DocumentSnapshot, a: DocumentSnapshot, b: DocumentSnapshot): Promise<void> => {
  const _a = {
    next: b.data()?.next,
    prev: b.id
  };
  const _b = {
    next: a.id,
    prev: a.data()?.prev
  };
  let aPrev = null;
  if (a.data()?.prev) {
    aPrev = await transaction.get(userDocSnap.ref.collection('timesOfDay').doc(a.data()?.prev)).then((docSnap) => docSnap);
  }
  let _aPrev = null;
  if (aPrev && aPrev.exists) {
    _aPrev = {
      next: b.id
    };
  }
  let bNext = null;
  if (b.data()?.next) {
    bNext = await transaction.get(userDocSnap.ref.collection('timesOfDay').doc(b.data()?.next)).then((docSnap) => docSnap);
  }
  let _bNext = null;
  if (bNext && bNext.exists) {
    _bNext = {
      prev: a.id
    };
  }
  transaction.update(a.ref, _a);
  transaction.update(b.ref, _b);
  if (aPrev && _aPrev) {
    transaction.update(aPrev.ref, _aPrev);
  }
  if (bNext && _bNext) {
    transaction.update(bNext.ref, _bNext);
  }
}

const processNotSiblings = async (transaction: Transaction, userDocSnap: DocumentSnapshot, a: DocumentSnapshot, b: DocumentSnapshot): Promise<void> => {

  const _a = {
    next: b.data()?.next,
    prev: b.id                                                                                                 ,
  }
  const _b = {
    next: a.id
  }

  let aNext = null;
  if (a.data()?.next) {
    aNext = await transaction.get(userDocSnap.ref.collection('timesOfDay').doc(a.data()?.next)).then((docSnap) => docSnap);
  }
  let _aNext = null;
  if (aNext && aNext.exists) {
    _aNext = {
      prev: a.data()?.prev
    };
  }

  let aPrev = null;
  if (a.data()?.prev) {
    aPrev = await transaction.get(userDocSnap.ref.collection('timesOfDay').doc(a.data()?.prev)).then((docSnap) => docSnap);
  }
  let _aPrev = null;
  if (aPrev && aPrev.exists) {
    _aPrev = {
      next: a.data()?.next
    };
  }

  let bNext = null;
  if (b.data()?.next) {
    bNext = await transaction.get(userDocSnap.ref.collection('timesOfDay').doc(b.data()?.next)).then((docSnap) => docSnap);
  }
  let _bNext = null;
  if (bNext && bNext.exists) {
    _bNext = {
      prev: a.id
    };
  }

  transaction.update(a.ref, _a);
  transaction.update(b.ref, _b);

  if (aPrev && _aPrev) {
    transaction.update(aPrev.ref, _aPrev);
  }

  if (aNext && _aNext) {
    transaction.update(aNext.ref, _aNext);
  }

  if (bNext && _bNext) {
    transaction.update(bNext.ref, _bNext);
  }
}

const processNotSiblings2 = async (transaction: Transaction, userDocSnap: DocumentSnapshot, a: DocumentSnapshot, b: DocumentSnapshot): Promise<void> => {

  const _a = {
    next: b.id,
    prev: b.data()?.prev                                                                                                 ,
  };
  const _b = {
    prev: a.id
  };

  let aNext = null;
  if (a.data()?.next) {
    aNext = await transaction.get(userDocSnap.ref.collection('timesOfDay').doc(a.data()?.next)).then((docSnap) => docSnap);
  }
  let _aNext = null;
  if (aNext && aNext.exists) {
    _aNext = {
      prev: a.data()?.prev
    };
  }

  let aPrev = null;
  if (a.data()?.prev) {
    aPrev = await transaction.get(userDocSnap.ref.collection('timesOfDay').doc(a.data()?.prev)).then((docSnap) => docSnap);
  }
  let _aPrev = null;
  if (aPrev && aPrev.exists) {
    _aPrev = {
      next: a.data()?.next
    };
  }

  let bPrev = null;
  if (b.data()?.prev) {
    bPrev = await transaction.get(userDocSnap.ref.collection('timesOfDay').doc(b.data()?.prev)).then((docSnap) => docSnap);
  }
  let _bPrev = null;
  if (bPrev && bPrev.exists) {
    _bPrev = {
      next: a.id
    };
  }

  transaction.update(a.ref, _a);
  transaction.update(b.ref, _b);

  if (aPrev && _aPrev) {
    transaction.update(aPrev.ref, _aPrev);
  }

  if (aNext && _aNext) {
    transaction.update(aNext.ref, _aNext);
  }

  if (bPrev && _bPrev) {
    transaction.update(bPrev.ref, _bPrev);
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

      const a = await transaction.get(userDocSnap.ref.collection('timesOfDay').doc(data.was)).then((docSnap) => docSnap);
      const b = await transaction.get(userDocSnap.ref.collection('timesOfDay').doc(data.is)).then((docSnap) => docSnap);

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
      if (data.dir > 0) {
        await processNotSiblings(transaction, userDocSnap, b, a);
      }

      // not siblings
      if (data.dir < 0) {
        await processNotSiblings2(transaction, userDocSnap, b, a);
      }

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
