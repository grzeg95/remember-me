import {Response} from 'express';
import {auth, firestore} from 'firebase-admin';
import {DecodedIdToken} from 'firebase-admin/auth';
import {https} from 'firebase-functions';
import {encrypt, getCryptoKey} from '../../helpers/security';
import {TransactionWrite} from '../../helpers/transaction-write';
import {authorizedDomains} from '../../config';

const sharp = require('sharp');

interface Context {
  req: https.Request,
  res: Response,
  auth?: DecodedIdToken
}

const acceptedContentTypes = new Set<string>(['image/jpeg', 'image/jpg', 'image/png']);
const maxContentLength = 10 * 1024 * 1024; // 10MB

const sendError = (res: Response, details?: string) => {
  res.status(400);
  res.type('application/json');
  res.send({
    code: 'invalid-argument',
    message: 'Bad Request',
    details: details || 'Some went wrong 🤫 Try again 🙂'
  });
  res.end();
};

const getContext = (req: https.Request, res: Response): Promise<Context> => {

  const authPromise = auth().verifyIdToken(req.headers.authorization?.split('Bearer ')[1] + '').catch(() => undefined);

  return Promise.all([authPromise]).then(([decodedIdToken]) => {
    return {
      req,
      res,
      auth: decodedIdToken
    };
  });
};

export const handler = (req: https.Request, res: Response): void | Promise<void> => {

  if (!process.env.FUNCTIONS_EMULATOR) {

    if (req.method !== 'POST') {
      sendError(res);
      return;
    }

    if (!req.headers.origin) {
      sendError(res);
      return;
    }

    if (!authorizedDomains.has(new URL(req.headers.origin).host)) {
      sendError(res);
      return;
    }
  }

  return getContext(req, res).then((context) => {

    if (!context.auth) {
      sendError(res);
      return;
    }

    // only for verified email or anonymous
    if (
      typeof context.auth.email_verified !== undefined &&
      !context.auth.email_verified &&
      !context.auth.isAnonymous
    ) {
      sendError(res);
      return;
    }

    if (!context.auth.secretKey) {
      sendError(res);
      return;
    }

    if (!acceptedContentTypes.has(context.req.get('content-type') || '')) {
      sendError(res);
      return;
    }

    if (+(req.get('content-length') || 0) > maxContentLength) {
      sendError(res, 'You can upload up to 10MB image 🙄');
      return;
    }

    let cryptoKey: CryptoKey;

    return getCryptoKey(context.auth.secretKey)
      .then((_cryptoKey) => {

        cryptoKey = _cryptoKey;

        return sharp(req.body)
          .resize({
            height: 256,
            width: 256
          })
          .jpeg({quality: 100})
          .toBuffer();
      }).then((imageBuffer) => {
        return encrypt(`data:image/jpeg;base64,${imageBuffer.toString('base64')}`, cryptoKey);
      }).then((encryptedPhotoUrl) => {

        const firestoreApp = firestore();
        return firestoreApp.runTransaction((transaction) => {

          const transactionWrite = new TransactionWrite(transaction);

          return transaction.get(firestoreApp.doc(`users/${context.auth?.uid}`))
            .then((userDocSnap) => {

              transactionWrite.update(userDocSnap.ref, {
                photoUrl: encryptedPhotoUrl
              });

              return transactionWrite.execute();
            });
        }).then(() => {
          context.res.status(200);
          context.res.type('application/json');
          context.res.send({message: 'Your picture has been updated 🙃'});
          context.res.end();
        }).catch(() => {
          sendError(context.res);
          return;
        });
      });
  });
};
