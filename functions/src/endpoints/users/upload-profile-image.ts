import {getDownloadURL, getStorage} from 'firebase-admin/storage';
import {getFirestore} from 'firebase-admin/firestore';
import {CallableRequest} from 'firebase-functions/v2/https';
import {z} from 'zod';
import {getUserRef} from '../../models/User';
import {testRequirement} from '../../utils/test-requirement';
import {TransactionWrite} from '../../utils/transaction-write';
import sharp = require('sharp');

const dataSchema = z.object({
  imageDataURL: z.string().min(1)
});

export const handler = async (request: CallableRequest) => {

  const auth = request.auth;

  testRequirement(!auth, {code: 'permission-denied'});

  const dataSchemaValidationResult = dataSchema.safeParse(request.data);
  testRequirement(!!dataSchemaValidationResult.error, {code: 'invalid-argument'});
  const data = dataSchemaValidationResult.data!;

  // max 5MB picture file
  // PayloadTooLargeError: request entity too large
  const maxContentLength = 5 * 1024 * 1024; // 5MB
  const blob = await fetch(data.imageDataURL).then((res) => res.blob()).then((blob) => blob);

  testRequirement(blob.size > maxContentLength, {message: 'You can upload up to 9MB image 🙄'});

  const arrayBuffer = await blob.arrayBuffer();

  const imageBuffer = await sharp(arrayBuffer)
    .rotate()
    .flatten({background: '#fff'})
    .resize({
      height: 256,
      width: 256
    })
    .jpeg({quality: 100})
    .toBuffer();

  const firestoreApp = getFirestore();
  const storageApp = getStorage();

  // const file = new File([new Blob([imageBuffer.toString()], {type: 'image/jpeg'})], 'profile.jpg', {type: 'image/jpeg'});
  // const url = URL.createObjectURL(file);

  const file = storageApp.bucket().file(`users/${auth!.uid}/profile.jpg`);
  await file.save(Buffer.from(imageBuffer), {
    metadata: { contentType: 'image/jpeg' }
  });

  await file.makePublic();
  const photoUrl = await getDownloadURL(file);

  await firestoreApp.runTransaction(async (transaction) => {

    const transactionWrite = new TransactionWrite(transaction);

    const userRef = getUserRef(firestoreApp, auth!.uid);
    const userSnap = await transaction.get(userRef);
    const user = userSnap.data();

    transactionWrite.set(userSnap.ref, {
      ...user,
      photoUrl
    });

    await transactionWrite.execute();
  });

  return {
    details: 'Your picture has been updated 🙃'
  };
};
