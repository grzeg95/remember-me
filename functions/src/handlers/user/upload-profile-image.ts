import {getFirestore} from 'firebase-admin/firestore';
import {CallableRequest} from 'firebase-functions/v2/https';
import {encrypt, getCryptoKey} from '../../utils/crypto';
import {testRequirement} from '../../utils/test-requirement';
import {TransactionWrite} from '../../utils/transaction-write';
import {getUserDocSnap} from '../../utils/user';
import sharp = require('sharp');

export const handler = async (request: CallableRequest) => {

  const auth = request.auth;
  const data = request.data;

  // without app check
  // not logged in
  // email not verified, not for anonymous
  testRequirement(!auth || (!auth?.token.email_verified &&
    auth?.token.provider_id !== 'anonymous' &&
    !auth?.token.isAnonymous) || !auth?.token.secretKey, {code: 'permission-denied'});

  testRequirement(!data || !data.imageDataURL || typeof data.imageDataURL !== 'string');

  // max 9MB picture file
  // PayloadTooLargeError: request entity too large
  const maxContentLength = 9 * 1024 * 1024; // 9MB
  const blob = await fetch(data.imageDataURL).then((res) => res.blob()).then((blob) => blob);

  testRequirement(blob.size > maxContentLength, {message: 'You can upload up to 9MB image 🙄'});

  const arrayBuffer = await blob.arrayBuffer();
  const cryptoKey = await getCryptoKey(auth?.token.secretKey);

  const imageBuffer = await sharp(arrayBuffer)
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

    const userDocSnap = await getUserDocSnap(firestoreApp, transaction, auth?.uid as string);
    transactionWrite.update(userDocSnap.ref, {
      photoURL: encryptedPhotoUrl
    });

    return transactionWrite.execute();
  }).then(() => {
    return {
      message: 'Your picture has been updated 🙃'
    };
  });
};
