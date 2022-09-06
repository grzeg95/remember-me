const {initializeApp, applicationDefault} = require('firebase-admin/app');
const {getAuth} = require('firebase-admin/auth');
const {KeyManagementServiceClient} = require('@google-cloud/kms');
const {publicEncrypt, constants} = require('crypto');
const {getFirestore} = require('firebase-admin/firestore');

const app = initializeApp({
  credential: applicationDefault(),
});
const auth = getAuth(app);
const firestore = getFirestore(app);
const now = Date.now();

const keyManagementServiceClient = new KeyManagementServiceClient();
const cryptoKeyVersionPath = keyManagementServiceClient.cryptoKeyVersionPath(
  'remember-me-4-keys',
  'europe-central2',
  'remember-me-4-keys-key-ring',
  'remember-me-4-keys-firebase-asymmetric',
  '1'
);

/**
 * Repair custom claims
 * @function handler
 * @param user firebase-admin.auth.UserRecord
 * @param publicKey protos.google.cloud.kms.v1.IPublicKey
 * @return Promise<Awaited<any>[]>
 **/
const repairCustomClaims = (user, publicKey) => {

  const promises = [];

  const customClaims = user.customClaims || {};

  // remove secretKey
  if (customClaims?.secretKey) {
    const secretKey = customClaims.secretKey;
    delete customClaims.secretKey;

    const encryptedSymmetricKey = publicEncrypt(
      {
        key: publicKey?.pem,
        oaepHash: 'sha256',
        padding: constants.RSA_PKCS1_OAEP_PADDING
      },
      Buffer.from(secretKey.toString('hex'))
    ).toString('hex');

    // update it lol
    promises.push(auth.setCustomUserClaims(user.uid, {
      ...customClaims,
      encryptedSymmetricKey
    }));
  }

  return Promise.all(promises);
};

/**
 * Repair custom claims
 * @function handler
 * @param user firebase-admin.auth.UserRecord
 * @return Promise<Awaited<any>[]>
 **/
const disableAnonymous = async (user) => {

  const promises = [];

  // timeLimit = 14 days
  const timeLimit = 1000 * 60 * 60 * 24 * 14;
  if (user.providerData.length === 0) {

    const lastRefreshTime = (new Date(user.metadata.lastRefreshTime)).getTime();

    if (now - lastRefreshTime > timeLimit) {
      if (!user.disabled) {
        promises.push(auth.updateUser(user.uid, {
          disabled: true
        }));
      }
    }
  }

  return Promise.all(promises);
};

return keyManagementServiceClient.getPublicKey({
  name: cryptoKeyVersionPath
}).then(([publicKey]) => {

  // for 1000 users
  return auth.listUsers().then((users) => {

    const promises = [];

    for (const user of users.users) {
      promises.push(repairCustomClaims(user, publicKey));
      promises.push(disableAnonymous(user));
    }

    return Promise.all(promises);
  });

});
