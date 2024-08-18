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
  readonly encryptedTimesOfDayIds: string[];
  readonly timesOfDayIdsCardinality: number[];
  readonly todayTasksIds: string[];
  readonly tasksIds: string[];
  readonly encryptedName: string;
}

export class Round implements RoundDoc {

  constructor(
    public readonly id: string,
    public readonly encryptedTimesOfDayIds: string[],
    public readonly timesOfDayIds: string[],
    public readonly timesOfDayIdsCardinality: number[],
    public readonly todayTasksIds: string[],
    public readonly tasksIds: string[],
    public readonly encryptedName: string,
    public readonly name: string,
    public readonly exists: boolean
  ) {
  }

  static converter = {
    toFirestore: (round: Round) => {
      return {
        encryptedTimesOfDayIds: round.encryptedTimesOfDayIds,
        timesOfDayIdsCardinality: round.timesOfDayIdsCardinality,
        todayTasksIds: round.todayTasksIds,
        tasksIds: round.tasksIds,
        encryptedName: round.encryptedName
      };
    },
    fromFirestore(snap: FirebaseFirestore.QueryDocumentSnapshot) {
      return snap.data();
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

    let encryptedTimesOfDayIds: string[] = [];
    let timesOfDayIdsCardinality: number[] = [];
    let todayTasksIds: string[] = [];
    let tasksIds: string[] = [];
    let encryptedName = '';

    if (
      data?.['encryptedTimesOfDayIds'] &&
      Array.isArray(data['encryptedTimesOfDayIds']) &&
      !data['encryptedTimesOfDayIds'].some((e) => typeof e !== 'string')
    ) {
      encryptedTimesOfDayIds = data['encryptedTimesOfDayIds'];
    }

    const timesOfDaysIds: string[] = [];

    for (const encryptedTimesOfDayId of encryptedTimesOfDayIds) {
      timesOfDaysIds.push(await decrypt(encryptedTimesOfDayId, cryptoKey) || '');
    }

    if (
      data?.['timesOfDayIdsCardinality'] &&
      Array.isArray(data['timesOfDayIdsCardinality']) &&
      !data['timesOfDayIdsCardinality'].some((e) => typeof e !== 'number')
    ) {
      timesOfDayIdsCardinality = data['timesOfDayIdsCardinality'];
    }

    if (
      data?.['todayTasksIds'] &&
      Array.isArray(data['todayTasksIds']) &&
      !data['todayTasksIds'].some((e) => typeof e !== 'string')
    ) {
      todayTasksIds = data['todayTasksIds'];
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
      encryptedTimesOfDayIds,
      timesOfDaysIds,
      timesOfDayIdsCardinality,
      todayTasksIds,
      tasksIds,
      encryptedName,
      name,
      snap.exists
    );
  }
}
