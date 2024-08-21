import {
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  FirestoreDataConverter,
  QueryDocumentSnapshot
} from 'firebase-admin/firestore';
import {decrypt} from '../utils/crypto';
import {Collection} from './collections';
import {Today} from './today';

export type TodayTaskDoc = {
  readonly description: string;
  readonly timesOfDay: {[key in string]: boolean};
} | DocumentData;

export class TodayTask {

  constructor(
    public readonly id: string,
    public readonly decryptedDescription: string,
    public readonly description: string,
    public readonly timesOfDay: {[key in string]: boolean},
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
      } as TodayTaskDoc;
    }
  } as FirestoreDataConverter<TodayTask>;

  static ref(todayRef: DocumentReference<Today>, id: string) {
    return todayRef.firestore.doc([todayRef.path, Collection.task, id].join('/')).withConverter(TodayTask._converter);
  }

  static refs(todayRef: DocumentReference<Today>) {
    return todayRef.firestore.collection([todayRef.path, Collection.task].join('/')).withConverter(TodayTask._converter);
  }

  static async data(docSnap: DocumentSnapshot<TodayTask>, cryptoKey: CryptoKey) {

    try {

      const timesOfDay: { [key in string]: boolean } = {};

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
      }

      return new TodayTask(
        docSnap.id,
        decryptedDescription || '',
        docSnap.data()!.description,
        docSnap.data()!.timesOfDay,
        docSnap.exists
      );

    } catch {
      return new TodayTask(
        '',
        '',
        '',
        {},
        false
      );
    }
  }
}
