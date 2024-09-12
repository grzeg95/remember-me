import {
  collection, doc,
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  FirestoreDataConverter,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import {BasicEncryptedValue, decrypt} from '../utils/crypto';
import {Collection} from '../services/firebase/collections';
import {Round, RoundDoc} from './round';

export type TodayDoc = DocumentData | BasicEncryptedValue;

export class Today {

  constructor(
    public readonly value: string,
    public readonly id: string,
    public readonly name: string,
    public readonly tasksIds: string[],
    public readonly exists: boolean
  ) {
  }

  private static _converter = {
    fromFirestore(snap: QueryDocumentSnapshot) {
      return snap.data();
    },
    toFirestore(today: Today) {
      return {
        value: today.value
      }
    }
  } as FirestoreDataConverter<Today, TodayDoc>;

  static ref(roundRef: DocumentReference<Round, RoundDoc>, id: string) {
    return doc(roundRef.firestore, [roundRef.path, Collection.today, id].join('/')).withConverter(Today._converter);
  }

  static refs(roundRef: DocumentReference<Round, RoundDoc>) {
    return collection(roundRef.firestore, [roundRef.path, Collection.today].join('/')).withConverter(Today._converter);
  }

  static async data(docSnap: DocumentSnapshot<Today, TodayDoc> | QueryDocumentSnapshot<Today, TodayDoc>, cryptoKey: CryptoKey) {

    try {

      const value = docSnap.data()?.value;
      const iToday = await decrypt<Round>(value, cryptoKey);

      return new Today(
        value!,
        docSnap.id,
        iToday!.name,
        iToday!.tasksIds,
        docSnap.exists()
      );

    } catch {
      return new Today(
        '',
        '',
        '',
        [],
        false
      );
    }
  }
}
