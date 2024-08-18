import {doc, collection, DocumentData, DocumentReference, DocumentSnapshot, FirestoreDataConverter, QueryDocumentSnapshot} from 'firebase/firestore';
import {decrypt, protectObjectDecryption} from '../utils/crypto';
import {Collections} from './collections';
import {User, UserDoc} from './user';

export interface RoundDoc extends DocumentData {
  readonly encryptedTimesOfDayIds: string[];
  readonly timesOfDayIdsCardinality: number[];
  readonly todayIds: string[];
  readonly tasksIds: string[];
  readonly encryptedName: string;
}

export class Round implements RoundDoc {

  private constructor(
    public readonly id: string,
    public readonly encryptedTimesOfDayIds: string[],
    public readonly timesOfDayIds: string[],
    public readonly timesOfDayIdsCardinality: number[],
    public readonly todayIds: string[],
    public readonly tasksIds: string[],
    public readonly encryptedName: string,
    public readonly name: string,
    public readonly exists: boolean
  ) {
  }

  private static _converter = {
    toFirestore: (round: Round) => {
      return {
        encryptedTimesOfDayIds: round.encryptedTimesOfDayIds,
        timesOfDayIdsCardinality: round.timesOfDayIdsCardinality,
        todayIds: round.todayIds,
        tasksIds: round.tasksIds,
        encryptedName: round.encryptedName
      };
    },
    fromFirestore(snapshot: QueryDocumentSnapshot) {
      return snapshot.data();
    }
  } as FirestoreDataConverter<Round, RoundDoc>;

  static ref(userRef: DocumentReference<User, UserDoc>, id?: string) {

    if (id) {
      return doc(userRef, [Collections.rounds, id].join('/')).withConverter(Round._converter);
    }

    return collection(userRef, [Collections.rounds].join('/')).withConverter(Round._converter);
  }

  static async data(snap: DocumentSnapshot<Round, RoundDoc> | QueryDocumentSnapshot<Round, RoundDoc>, cryptoKey: CryptoKey) {

    const data = snap.data();

    let encryptedTimesOfDayIds: string[] = [];
    let timesOfDayIdsCardinality: number[] = [];
    let todayIds: string[] = [];
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
      encryptedTimesOfDayIds,
      timesOfDaysIds,
      timesOfDayIdsCardinality,
      todayIds,
      tasksIds,
      encryptedName,
      name,
      snap.exists()
    );
  }
}
