import {
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  FirestoreDataConverter,
  QueryDocumentSnapshot
} from 'firebase-admin/firestore';
import {BasicEncryptedValue, decrypt} from '../utils/crypto';
import {Collection} from './collections';
import {Round} from './round';

export type TodayDoc = BasicEncryptedValue | DocumentData;

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
      } as TodayDoc;
    }
  } as FirestoreDataConverter<Today>;

  static ref(roundRef: DocumentReference<Round>, id: string) {
    return roundRef.firestore.doc([roundRef.path, Collection.today, id].join('/')).withConverter(Today._converter);
  }

  static refs(roundRef: DocumentReference<Round>) {
    return roundRef.firestore.collection([roundRef.path, Collection.today].join('/')).withConverter(Today._converter);
  }

  static async data(docSnap: DocumentSnapshot<Today> | QueryDocumentSnapshot<Today>, cryptoKey: CryptoKey) {

    try {

      const value = docSnap.data()?.value;
      const iToday = await decrypt<Round>(value, cryptoKey);

      return new Today(
        value!,
        docSnap.id,
        iToday!.name,
        iToday!.tasksIds,
        docSnap.exists
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
