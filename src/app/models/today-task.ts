import {
  collection,
  doc,
  DocumentData, DocumentReference,
  DocumentSnapshot,
  Firestore,
  FirestoreDataConverter,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import {User as FirebaseUser} from 'firebase/auth';
import {decrypt} from '../utils/crypto';
import {Collection} from '../services/firebase/collections';
import {Today, TodayDoc} from './today';

export type TodayTaskDoc = {
  readonly description: string;
  readonly timesOfDay: {[key in string]: boolean};
} & DocumentData;

export class TodayTask implements TodayTaskDoc {

  constructor(
    public readonly id: string,
    public readonly decryptedDescription: string,
    public readonly description: string,
    public readonly timesOfDay: {[key in string]: boolean},
    public readonly timesOfDayEncryptedMap: {[key in string]: string},
    public readonly exists: boolean
  ) {
  }

  private static _converter = {
    fromFirestore(snap: QueryDocumentSnapshot) {
      return snap.data();
    },
    toFirestore(todayTask: TodayTask) {
      return {
        description: todayTask.description,
        timesOfDay: todayTask.timesOfDay
      } as TodayTaskDoc
    }
  } as FirestoreDataConverter<TodayTask, TodayTaskDoc>;

  static ref(todayRef: DocumentReference<Today, TodayDoc>, id: string) {
    return doc(todayRef.firestore, [todayRef.path, Collection.task, id].join('/')).withConverter(TodayTask._converter);
  }

  static refs(todayRef: DocumentReference<Today, TodayDoc>) {
    return collection(todayRef.firestore, [todayRef.path, Collection.task].join('/')).withConverter(TodayTask._converter);
  }

  static async data(docSnap: DocumentSnapshot<TodayTask, TodayTaskDoc>, cryptoKey: CryptoKey) {

    try {

      const timesOfDay: { [key in string]: boolean } = {};
      const timesOfDayEncryptedMap: { [key in string]: string } = {};

      const decryptedKeysPromise: Promise<string | null>[] = [];
      const encryptedKeys = Object.getOwnPropertyNames(docSnap.data()!.timesOfDay);
      const decryptedDescriptionPromise = decrypt<string>(docSnap.data()!.description, cryptoKey);

      for (const encryptedKey of encryptedKeys) {
        decryptedKeysPromise.push(decrypt(encryptedKey, cryptoKey));
      }

      const decryptedKeys = await Promise.all(decryptedKeysPromise);
      const decryptedDescription = await decryptedDescriptionPromise;

      for (const [i, decryptedKey] of decryptedKeys.entries()) {
        timesOfDay[decryptedKey as string] = (docSnap.data()!.timesOfDay as { [key in string]: boolean }) [encryptedKeys[i]];
        timesOfDayEncryptedMap[decryptedKey as string] = encryptedKeys[i];
      }

      return new TodayTask(
        docSnap.id,
        decryptedDescription || '',
        docSnap.data()!.description,
        docSnap.data()!.timesOfDay,
        timesOfDayEncryptedMap,
        docSnap.exists()
      )

    } catch {
      return new TodayTask(
        '',
        '',
        '',
        {},
        {},
        false
      );
    }
  }
}
