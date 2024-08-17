import {DocumentData, DocumentReference, DocumentSnapshot, FirestoreDataConverter} from 'firebase-admin/firestore';
import {decrypt, protectObjectDecryption} from '../utils/crypto';
import {Collections} from './collections';
import {Day} from './day';
import {Round, RoundDoc} from './round';

export interface TaskDoc extends DocumentData {
  readonly encryptedDescription: string;
  readonly timesOfDayIds: string[];
  readonly encryptedDaysOfTheWeek: string[];
}

export class Task implements TaskDoc {

  constructor(
    public readonly id: string,
    public readonly encryptedDescription: string,
    public readonly description: string,
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
        timesOfDayIds: task.timesOfDayIds,
        encryptedDaysOfTheWeek: task.encryptedDaysOfTheWeek
      };
    },
    fromFirestore(snap: FirebaseFirestore.QueryDocumentSnapshot) {
      return snap.data();
    }
  } as FirestoreDataConverter<Task, TaskDoc>;

  static ref(roundRef: DocumentReference<Round, RoundDoc>, id?: string) {

    if (id) {
      return roundRef.firestore.doc([roundRef.path, Collections.tasks, id].join('/')).withConverter(Task._converter);
    }

    return roundRef.firestore.collection([roundRef.path, Collections.tasks].join('/')).doc().withConverter(Task._converter);
  }

  static refs(roundRef: DocumentReference<Round, RoundDoc>) {
    return roundRef.firestore.collection([roundRef.path, Collections.tasks].join('/')).withConverter(Task._converter);
  }

  static async data(snap: DocumentSnapshot<Task, TaskDoc>, cryptoKey: CryptoKey) {

    const data = snap.data();

    let encryptedDescription = '';
    let timesOfDayIds: string[] = [];
    let encryptedDaysOfTheWeek: string[] = [];

    data?.['encryptedDescription'] && typeof data['encryptedDescription'] === 'string' && (encryptedDescription = data['encryptedDescription']);

    if (
      data?.['timesOfDayIds'] &&
      Array.isArray(data['timesOfDayIds']) &&
      !data['timesOfDayIds'].some((e) => typeof e !== 'string')
    ) {
      timesOfDayIds = data['timesOfDayIds'];
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

    return new Task(
      snap.id,
      encryptedDescription,
      description,
      timesOfDayIds,
      encryptedDaysOfTheWeek,
      daysOfTheWeek,
      snap.exists
    );
  }
}
