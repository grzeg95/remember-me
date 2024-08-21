import {
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  FirestoreDataConverter,
  QueryDocumentSnapshot
} from 'firebase-admin/firestore';
import {BasicEncryptedValue, decrypt} from '../utils/crypto';
import {Collection} from './collections';
import {User} from './user';

export type RoundDoc = BasicEncryptedValue | DocumentData;

export type RoundDocUncrypded = {
  timesOfDay: string[];
  timesOfDayCardinality: number[];
  name: string,
  todaysIds: string[],
  tasksIds: string[]
}

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
      } as RoundDoc;
    }
  } as FirestoreDataConverter<Round>;

  static ref(userRef: DocumentReference<User>, id?: string) {

    if (id) {
      return userRef.firestore.doc([userRef.path, Collection.rounds, id].join('/')).withConverter(Round._converter);
    }

    return userRef.firestore.collection([userRef.path, Collection.rounds].join('/')).doc().withConverter(Round._converter);
  }

  static refs(userRef: DocumentReference<User>) {
    return userRef.firestore.collection([userRef.path, Collection.rounds].join('/')).withConverter(Round._converter);
  }

  static async data(docSnap: DocumentSnapshot<Round> | QueryDocumentSnapshot<Round>, cryptoKey: CryptoKey) {

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
        docSnap.exists
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
