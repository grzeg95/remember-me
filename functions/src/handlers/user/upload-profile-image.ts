import {getFirestore} from 'firebase-admin/firestore';
import {
  Context,
  encrypt,
  FunctionResultPromise,
  getCryptoKey,
  getUserDocSnap,
  testRequirement,
  TransactionWrite
} from '../../tools';

const sharp = require('sharp');

export const handler = async (context: Context): FunctionResultPromise => {

  const auth = context.auth;
  const data = context.data;

  // without app check
  // not logged in
  // email not verified, not for anonymous
  testRequirement(!context.app || !auth || (!auth?.token.email_verified &&
    auth?.token.provider_id !== 'anonymous' &&
    !auth?.token.isAnonymous) || !auth?.token.secretKey, {code: 'permission-denied'});

  // max 9MB picture file
  // PayloadTooLargeError: request entity too large
  const maxContentLength = 9 * 1024 * 1024; // 9MB
  testRequirement(+(context.req.get('content-length') || 0) > maxContentLength, {message: 'You can upload up to 9MB image 🙄'});

  const cryptoKey = await getCryptoKey(context.auth?.token.secretKey);
  const imageBuffer = await sharp(data)
    .rotate()
    .flatten({background: '#fff'})
    .resize({
      height: 256,
      width: 256
    })
    .jpeg({quality: 100})
    .toBuffer();

  const encryptedPhotoUrl = await encrypt(`data:image/jpeg;base64,${imageBuffer.toString('base64')}`, cryptoKey);

  const firestoreApp = getFirestore();

  return firestoreApp.runTransaction(async (transaction) => {

    const transactionWrite = new TransactionWrite(transaction);

    const userDocSnap = await getUserDocSnap(firestoreApp, transaction, context.auth?.uid as string);
    transactionWrite.update(userDocSnap.ref, {
      photoURL: encryptedPhotoUrl
    });

    return transactionWrite.execute();
  }).then(() => {
    return {
      code: 200,
      body: {
        message: 'Your picture has been updated 🙃'
      }
    };
  });
};
