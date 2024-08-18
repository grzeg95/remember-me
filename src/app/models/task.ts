import {
  collection,
  doc,
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  FirestoreDataConverter,
  QueryDocumentSnapshot
} from 'firebase/firestore';

import {decrypt, protectObjectDecryption} from '../utils/crypto';
import {Collections} from './collections';
import {Day} from './day';
import {Round, RoundDoc} from './round';

export interface TaskDoc extends DocumentData {
  readonly encryptedDescription: string;
  readonly encryptedTimesOfDayIds: string[];
  readonly encryptedDaysOfTheWeek: string[];
}

export class Task implements TaskDoc {

  private constructor(
    public readonly id: string,
    public readonly encryptedDescription: string,
    public readonly description: string,
    public readonly encryptedTimesOfDayIds: string[],
    public readonly timesOfDayIds: string[],
    public readonly encryptedDaysOfTheWeek: string[],
    public readonly daysOfTheWeek: Day[],
    public readonly exists: boolean
  ) {
  }

  private static _converter = {
    toFirestore: (task: Task) => {
      return {
        encryptedDescription: task.encryptedDescription,
        encryptedTimesOfDayIds: task.encryptedTimesOfDayIds,
        encryptedDaysOfTheWeek: task.encryptedDaysOfTheWeek
      };
    },
    fromFirestore(snapshot: QueryDocumentSnapshot) {
      return snapshot.data();
    }
  } as FirestoreDataConverter<Task, TaskDoc>;

  static ref(roundRef: DocumentReference<Round, RoundDoc>, id?: string) {

    if (id) {
      return doc(roundRef, [Collections.tasks, id].join('/')).withConverter(Task._converter);
    }

    return collection(roundRef, [Collections.tasks].join('/')).withConverter(Task._converter);
  }

  static async data(snap: DocumentSnapshot<Task, TaskDoc>, cryptoKey: CryptoKey) {

    const data = snap.data();

    let encryptedDescription = '';
    let encryptedTimesOfDayIds: string[] = [];
    let encryptedDaysOfTheWeek: string[] = [];

    data?.['encryptedDescription'] && typeof data['encryptedDescription'] === 'string' && (encryptedDescription = data['encryptedDescription']);

    if (
      data?.['encryptedTimesOfDayIds'] &&
      Array.isArray(data['encryptedTimesOfDayIds']) &&
      !data['encryptedTimesOfDayIds'].some((e) => typeof e !== 'string')
    ) {
      encryptedTimesOfDayIds = data['encryptedTimesOfDayIds'];
    }

    if (
      data?.['encryptedDaysOfTheWeek'] &&
      Array.isArray(data['encryptedDaysOfTheWeek']) &&
      !data['encryptedDaysOfTheWeek'].some((e) => typeof e !== 'string')
    ) {
      encryptedDaysOfTheWeek = data['encryptedDaysOfTheWeek'];
    }

    const description = await decrypt<string>(encryptedDescription, cryptoKey).then(protectObjectDecryption<string>(''));
    const daysOfTheWeek: Day[] = [];

    for (const encryptedDayOfTheWeek of encryptedDaysOfTheWeek) {

      const day = await decrypt(encryptedDayOfTheWeek, cryptoKey);

      if (day) {
        daysOfTheWeek.push(day as Day);
      }
    }

    const timesOfDayIds: string[] = [];

    for (const encryptedTimesOfDayId of encryptedTimesOfDayIds) {
      timesOfDayIds.push(await decrypt(encryptedTimesOfDayId, cryptoKey) || '');
    }

    return new Task(
      snap.id,
      encryptedDescription,
      description,
      encryptedTimesOfDayIds,
      timesOfDayIds,
      encryptedDaysOfTheWeek,
      daysOfTheWeek,
      snap.exists()
    );
  }
}
