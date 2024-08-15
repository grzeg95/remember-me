import {
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  FirestoreDataConverter,
  QueryDocumentSnapshot
} from 'firebase-admin/firestore';
import {protectObjectDecryption, decrypt} from '../utils/crypto';
import {Collections} from './collections';
import {User, UserDoc} from './user';

export interface RoundDoc extends DocumentData {
  readonly timesOfDayIds: string[];
  readonly timesOfDayIdsCardinality: number[];
  readonly todayIds: string[];
  readonly tasksIds: string[];
  readonly encryptedName: string;
}

export class Round implements RoundDoc {

  constructor(
    public readonly id: string,
    public readonly timesOfDayIds: string[],
    public readonly timesOfDayIdsCardinality: number[],
    public readonly todayIds: string[],
    public readonly tasksIds: string[],
    public readonly encryptedName: string,
    public readonly name: string,
    public readonly exists: boolean
  ) {
  }

  static converter = {
    toFirestore: (round: Round) => {
      return {
        timesOfDayIds: round.timesOfDayIds,
        timesOfDayIdsCardinality: round.timesOfDayIdsCardinality,
        todayIds: round.todayIds,
        tasksIds: round.tasksIds,
        encryptedName: round.encryptedName
      };
    }
  } as FirestoreDataConverter<Round, RoundDoc>;

  static ref(userRef: DocumentReference<User, UserDoc>, id?: string) {

    if (id) {
      return userRef.firestore.doc([userRef.path, Collections.rounds, id].join('/')).withConverter(Round.converter);
    }

    return userRef.firestore.collection([userRef.path, Collections.rounds].join('/')).doc().withConverter(Round.converter);
  }

  static refs(userRef: DocumentReference<User, UserDoc>) {
    return userRef.firestore.collection([userRef.path, Collections.rounds].join('/')).withConverter(Round.converter);
  }

  static async data(snap: DocumentSnapshot<Round, RoundDoc> | QueryDocumentSnapshot<Round, RoundDoc>, cryptoKey: CryptoKey) {

    const data = snap.data();

    let timesOfDaysIds: string[] = [];
    let timesOfDayIdsCardinality: number[] = [];
    let todayIds: string[] = [];
    let tasksIds: string[] = [];
    let encryptedName = '';

    if (
      data?.['timesOfDayIds'] &&
      Array.isArray(data['timesOfDayIds']) &&
      !data['timesOfDayIds'].some((e) => typeof e !== 'string')
    ) {
      timesOfDaysIds = data['timesOfDayIds'];
    }

    if (
      data?.['timesOfDayIdsCardinality'] &&
      Array.isArray(data['timesOfDayIdsCardinality']) &&
      !data['timesOfDayIdsCardinality'].some((e) => typeof e !== 'number')
    ) {
      timesOfDayIdsCardinality = data['timesOfDayIdsCardinality'];
    }

    if (
      data?.['todayIds'] &&
      Array.isArray(data['todayIds']) &&
      !data['todayIds'].some((e) => typeof e !== 'string')
    ) {
      todayIds = data['todayIds'];
    }

    if (
      data?.['tasksIds'] &&
      Array.isArray(data['tasksIds']) &&
      !data['tasksIds'].some((e) => typeof e !== 'string')
    ) {
      tasksIds = data['tasksIds'];
    }

    data?.['encryptedName'] && typeof data['encryptedName'] === 'string' && (encryptedName = data['encryptedName']);

    const name = await decrypt<string>(encryptedName, cryptoKey).then(protectObjectDecryption<string>(''));

    return new Round(
      snap.id,
      timesOfDaysIds,
      timesOfDayIdsCardinality,
      todayIds,
      tasksIds,
      encryptedName,
      name,
      snap.exists
    );
  }
}
