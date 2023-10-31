require('../global.prototype');// tsc it
const {initializeApp, applicationDefault} = require('firebase-admin/app');
const {getAuth} = require('firebase-admin/auth');
const {KeyManagementServiceClient} = require('@google-cloud/kms');
const {publicEncrypt, constants} = require('crypto');
const {getFirestore, FieldValue} = require('firebase-admin/firestore');
const dotenv = require('dotenv');
const path = require('path');

const DOTENV_PATH = path.join(__dirname, '../functions/.env.functions.prod');
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
      console.log(`Edited ${user.uid} custom claims: ${JSON.stringify(customClaims)}`);
      user.customClaims = customClaims;
      return user;
    }).catch((e) => {
      console.log(`Edit error of ${user.uid} custom claims: ${JSON.stringify(customClaims)}`);
      throw e;
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

  const properties = {};

  // time limit = 14 days
  const timeLimit = 1000 * 60 * 60 * 24 * 14;
  if (user.providerData.length === 0) {

    const lastRefreshTime = (new Date(user.metadata.lastRefreshTime)).getTime();

    if (now - lastRefreshTime > timeLimit) {
      if (!user.disabled) {
        properties['disabled'] = true;
      }
    }
  }

  if (Object.getOwnPropertyNames(properties).length) {
    return auth.updateUser(user.uid, properties).then(() => {
      console.log(`Edited ${user.uid} auth properties: ${JSON.stringify(properties)}`);

      for (const key of properties) {
        user[key] = properties[key];
      }
      return user;
    }).catch((e) => {
      console.log(`Edit error of ${user.uid} auth properties: ${JSON.stringify(properties)}`);
      throw e;
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

    const propertiesToChange = {};

    // set disabled
    if (user.disabled && typeof userDocSnap.data().disabled !== 'boolean') {
      propertiesToChange['disabled'] = true;
    } else if (!user.disabled && typeof userDocSnap.data().disabled !== 'undefined') {
      propertiesToChange['disabled'] = FieldValue.delete();
    }

    // remove other fields in user doc than accepted fields
    const acceptedFields = new Set(['disabled', 'photoUrl', 'rounds', 'hasEncryptedSecretKey']);
    const allUserFields = new Set(Object.getOwnPropertyNames(userDocSnap.data()));
    const fieldsToRemove = allUserFields.difference(acceptedFields).toArray();

    if (fieldsToRemove.length) {
      for (const fieldToRemove of fieldsToRemove) {
        propertiesToChange[fieldToRemove] = FieldValue.delete();
      }
    }

    // add hasEncryptedSecretKey if user has it
    if (user.customClaims?.encryptedSymmetricKey && !userDocSnap.data().hasEncryptedSecretKey) {
      propertiesToChange['hasEncryptedSecretKey'] = true;
    }

    if (Object.getOwnPropertyNames(propertiesToChange).length) {
      return userDocSnap.ref.update(propertiesToChange).then(() => {
        console.log(`Edited ${user.uid} firestore properties: ${JSON.stringify(propertiesToChange)}`);
        return user;
      }).catch((e) => {
        console.log(`Edit error of ${user.uid} firestore properties: ${JSON.stringify(propertiesToChange)}`);
        throw e;
      });
    }

    return user;
  });
};

const processNextChunkOfUsers = (publicKey, nextPageToken) => {

  return getAuth().listUsers(1000, nextPageToken).then(async (listUsersResult) => {
    console.log(`Processing next ${listUsersResult.users.length} users`);

    const promises = [];

    for (const user of listUsersResult.users) {
      promises.push(
        repairCustomClaims(user, publicKey)
          .then(repairUserAuth)
          .then(repairUserFirestoreFields)
      );
    }

    for (const promise of promises) {
      await promise;
    }

    if (listUsersResult.pageToken) {
      setTimeout(() => processNextChunkOfUsers(publicKey, listUsersResult.pageToken));
    }
  });
};

console.log('Getting public key');
keyManagementServiceClient.getPublicKey({
  name: cryptoKeyVersionPath
}).then(([publicKey]) => setTimeout(() => processNextChunkOfUsers(publicKey)));
