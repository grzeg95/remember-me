import {
  collection, doc,
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  FirestoreDataConverter,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import {BasicEncryptedValue, decrypt} from '../utils/crypto';
import {Collection} from './collections';
import {Day} from './models';
import {User, UserDoc} from './user';

export type RoundDoc = DocumentData | BasicEncryptedValue;

export class Round {

  constructor(
    public readonly value: string,
    public readonly id: string,
    public readonly timesOfDayEncrypted: string[],
    public readonly timesOfDay: string[],
    public readonly timesOfDayCardinality: number[],
    public readonly todaysIds: string[],
    public readonly tasksIds: string[],
    public readonly name: string,
    public readonly exists: boolean
  ) {
  }

  private static _converter = {
    fromFirestore(snap: QueryDocumentSnapshot) {
      return snap.data();
    },
    toFirestore(round: Round) {
      return {
        value: round.value
      }
    }
  } as FirestoreDataConverter<Round, RoundDoc>;

  static ref(userRef: DocumentReference<User, UserDoc>, id: string) {
    return doc(userRef.firestore, [userRef.path, Collection.rounds, id].join('/')).withConverter(Round._converter);
  }

  static refs(userRef: DocumentReference<User, UserDoc>) {
    return collection(userRef.firestore, [userRef.path, Collection.rounds].join('/')).withConverter(Round._converter);
  }

  static async data(docSnap: DocumentSnapshot<Round, RoundDoc> | QueryDocumentSnapshot<Round, RoundDoc>, cryptoKey: CryptoKey) {

    try {

      const value = docSnap.data()?.value;
      const iRound = await decrypt<Round>(value, cryptoKey);

      return new Round(
        value!,
        docSnap.id,
        iRound!.timesOfDayEncrypted,
        iRound!.timesOfDay,
        iRound!.timesOfDayCardinality,
        iRound!.todaysIds,
        iRound!.tasksIds,
        iRound!.name,
        docSnap.exists()
      );

    } catch (e) {
      console.error(e);
      return new Round(
        '',
        '',
        [],
        [],
        [],
        [],
        [],
        '',
        false
      );
    }
  }
}
