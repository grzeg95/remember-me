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

export const handler = (context: Context): FunctionResultPromise => {

  const auth = context.auth;
  const data = context.data;

  testRequirement(!auth);

  // only for verified email or anonymous
  testRequirement(
    typeof auth?.token.email_verified !== undefined &&
    !auth?.token.email_verified &&
    !auth?.token.isAnonymous
  );

  testRequirement(!auth?.token.secretKey);

  const maxContentLength = 10 * 1024 * 1024; // 10MB
  testRequirement(+(context.req.get('content-length') || 0) > maxContentLength, 'You can upload up to 10MB image 🙄');

  let cryptoKey: CryptoKey;

  return getCryptoKey(context.auth?.token.secretKey)
    .then((_cryptoKey) => {

      cryptoKey = _cryptoKey;

      return sharp(data)
        .rotate()
        .flatten({background: '#fff'})
        .resize({
          height: 256,
          width: 256
        })
        .jpeg({quality: 100})
        .toBuffer();
    }).then((imageBuffer) => {
      return encrypt(`data:image/jpeg;base64,${imageBuffer.toString('base64')}`, cryptoKey);
    }).then((encryptedPhotoUrl) => {

      const firestoreApp = getFirestore();
      return firestoreApp.runTransaction((transaction) => {

        const transactionWrite = new TransactionWrite(transaction);

        return getUserDocSnap(firestoreApp, transaction, context.auth?.uid as string).then((userDocSnap) => {
          transactionWrite.update(userDocSnap.ref, {
            photoUrl: encryptedPhotoUrl
          });

          return transactionWrite.execute();
        });
      }).then(() => {
        return {
          code: 200,
          body: {
            message: 'Your picture has been updated 🙃'
          }
        };
      });
    });
};
