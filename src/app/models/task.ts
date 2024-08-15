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
  readonly timesOfDayIds: string[];
  readonly encryptedDaysOfTheWeek: string;
}

export class Task implements TaskDoc {

  private constructor(
    public readonly id: string,
    public readonly encryptedDescription: string,
    public readonly description: string,
    public readonly timesOfDayIds: string[],
    public readonly encryptedDaysOfTheWeek: string,
    public readonly daysOfTheWeek: Day[],
    public readonly exists: boolean
  ) {
  }

  private static _converter = {
    toFirestore: (task: Task) => {
      return {
        encryptedDescription: task.encryptedDescription,
        timesOfDayIds: task.timesOfDayIds,
        encryptedDaysOfTheWeek: task.encryptedDaysOfTheWeek
      };
    },
    fromFirestore(snapshot: QueryDocumentSnapshot) {
      return snapshot.data();
    }
  } as FirestoreDataConverter<Task, TaskDoc>;

  static ref(roundRef: DocumentReference<Round, RoundDoc>, id?: string) {

    if (id) {
      return doc(roundRef, Collections.tasks, id).withConverter(Task._converter);
    }

    return collection(roundRef, Collections.tasks).withConverter(Task._converter);
  }

  static async data(snap: DocumentSnapshot<Task, TaskDoc>, cryptoKey: CryptoKey) {

    const data = snap.data();

    let encryptedDescription: string = '';
    let timesOfDayIds: string[] = [];
    let encryptedDaysOfTheWeek: string = '';

    data?.['encryptedDescription'] && typeof data['encryptedDescription'] === 'string' && (encryptedDescription = data['encryptedDescription']);

    if (
      data?.['timesOfDayIds'] &&
      Array.isArray(data['timesOfDayIds']) &&
      !data['timesOfDayIds'].some((e) => typeof e !== 'string')
    ) {
      timesOfDayIds = data['timesOfDayIds'];
    }

    data?.['encryptedDaysOfTheWeek'] && typeof data['encryptedDaysOfTheWeek'] === 'string' && (encryptedDaysOfTheWeek = data['encryptedDaysOfTheWeek']);

    const description = await decrypt<string>(encryptedDescription, cryptoKey).then(protectObjectDecryption<string>(''));
    const daysOfTheWeek = await decrypt<Day[]>(encryptedDescription, cryptoKey).then(protectObjectDecryption<Day[]>([]));

    return new Task(
      snap.id,
      encryptedDescription,
      description,
      timesOfDayIds,
      encryptedDaysOfTheWeek,
      daysOfTheWeek,
      snap.exists()
    );
  }
}
