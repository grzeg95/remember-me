require('../global.prototype');// tsc it
const {initializeApp, applicationDefault} = require('firebase-admin/app');
const {getAuth} = require('firebase-admin/auth');
const {KeyManagementServiceClient} = require('@google-cloud/kms');
const {publicEncrypt, constants} = require('crypto');
const {getFirestore, FieldValue} = require('firebase-admin/firestore');
const dotenv = require('dotenv');
const path = require('path');

const DOTENV_PATH = path.join(__dirname, '../', '.env.functions.prod');
dotenv.config({path: DOTENV_PATH, override: true});

const app = initializeApp({
  credential: applicationDefault()
});
const auth = getAuth(app);
const firestore = getFirestore(app);
const now = Date.now();

const keyManagementServiceClient = new KeyManagementServiceClient();
const cryptoKeyVersionPath = keyManagementServiceClient.cryptoKeyVersionPath(
  process.env.CRYPTO_KEY_VERSION_PATH_PROJECT,
  process.env.PROJECT_FIREBASE_REGION_ID,
  process.env.CRYPTO_KEY_VERSION_PATH_KEY_RING,
  process.env.CRYPTO_KEY_VERSION_PATH_KEY_CRYPTO_KEY,
  process.env.CRYPTO_KEY_VERSION_PATH_KEY_CRYPTO_KEY_VERSION
);

/**
 * Repair custom claims
 * @function handler
 * @param user firebase-admin.auth.UserRecord
 * @param publicKey protos.google.cloud.kms.v1.IPublicKey
 * @return Promise<firebase-admin.auth.UserRecord>
 **/
const repairCustomClaims = async (user, publicKey) => {

  let changed = false;
  const customClaims = user.customClaims || {};

  // remove secretKey
  if (customClaims?.secretKey) {
    const secretKey = customClaims.secretKey;
    delete customClaims.secretKey;

    customClaims['encryptedSymmetricKey'] = publicEncrypt(
      {
        key: publicKey?.pem,
        oaepHash: 'sha256',
        padding: constants.RSA_PKCS1_OAEP_PADDING
      },
      Buffer.from(secretKey.toString('hex'))
    ).toString('hex');

    changed = true;
  }

  if (changed) {
    return auth.setCustomUserClaims(user.uid, customClaims).then(() => {
      user.customClaims = customClaims;
      return user;
    });
  }

  return user;
};

/**
 * Repair user auth
 * @function handler
 * @param user firebase-admin.auth.UserRecord
 * @return Promise<Awaited<any>[]>
 **/
const repairUserAuth = async (user) => {

  const keysToChange = {};

  // time limit = 14 days
  const timeLimit = 1000 * 60 * 60 * 24 * 14;
  if (user.providerData.length === 0) {

    const lastRefreshTime = (new Date(user.metadata.lastRefreshTime)).getTime();

    if (now - lastRefreshTime > timeLimit) {
      if (!user.disabled) {
        keysToChange['disabled'] = true;
      }
    }
  }

  if (Object.getOwnPropertyNames(keysToChange).length) {
    return Promise.all(promises).then(() => {
      auth.getUser(user.uid);
      for (const key of keysToChange) {
        user[key] = keysToChange[key];
      }
      return user;
    });
  }

  return user;
};

/**
 * Repair user firestore fields
 * @function handler
 * @param user firebase-admin.auth.UserRecord
 * @return Promise<firebase-admin.auth.UserRecord>
 **/
const repairUserFirestoreFields = async (user) => {

  return firestore.doc(`users/${user.uid}`).get().then((userDocSnap) => {

    const keysToChange = {};

    // set disabled
    if (user.disabled && typeof userDocSnap.data().disabled !== 'boolean') {
      keysToChange['disabled'] = true;
    } else if (!user.disabled && typeof userDocSnap.data().disabled !== 'undefined') {
      keysToChange['disabled'] = FieldValue.delete();
    }

    // remove other fields in user doc than accepted fields
    const acceptedFields = new Set(['disabled', 'photoUrl', 'rounds', 'hasEncryptedSecretKey']);
    const allUserFields = new Set(Object.getOwnPropertyNames(userDocSnap.data()));
    const fieldsToRemove = allUserFields.difference(acceptedFields).toArray();

    if (fieldsToRemove.length) {
      for (const fieldToRemove of fieldsToRemove) {
        keysToChange[fieldToRemove] = FieldValue.delete();
      }
    }

    // add hasEncryptedSecretKey if user has it
    if (user.customClaims?.encryptedSymmetricKey && !userDocSnap.data().hasEncryptedSecretKey) {
      keysToChange['hasEncryptedSecretKey'] = true;
    }

    if (Object.getOwnPropertyNames(keysToChange).length) {
      return userDocSnap.ref.update(keysToChange).then(() => user);
    }

    return user;
  });
};

return keyManagementServiceClient.getPublicKey({
  name: cryptoKeyVersionPath
}).then(([publicKey]) => {

  // for 1000 users
  return auth.listUsers().then((users) => {

    const promises = [];

    for (const user of users.users) {
      promises.push(
        repairCustomClaims(user, publicKey)
          .then(repairUserAuth)
          .then(repairUserFirestoreFields)
      );
    }

    return Promise.all(promises);
  });
});
