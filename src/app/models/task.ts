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
import {Day} from './day';
import {Round, RoundDoc} from './round';

export type TaskDoc = DocumentData | BasicEncryptedValue;

export class Task {

  constructor(
    public readonly value: string,
    public readonly id: string,
    public readonly description: string,
    public readonly timesOfDay: string[],
    public readonly daysOfTheWeek: Day[],
    public readonly exists: boolean
  ) {
  }

  private static _converter = {
    fromFirestore(snap: QueryDocumentSnapshot) {
      return snap.data();
    },
    toFirestore(task: Task) {
      return {
        value: task.value
      }
    }
  } as FirestoreDataConverter<Task, TaskDoc>;

  static ref(roundRef: DocumentReference<Round, RoundDoc>, id: string) {
    return doc(roundRef.firestore, [roundRef.path, Collection.task, id].join('/')).withConverter(Task._converter);
  }

  static refs(roundRef: DocumentReference<Round, RoundDoc>) {
    return collection(roundRef.firestore, [roundRef.path, Collection.task].join('/')).withConverter(Task._converter);
  }

  static async data(docSnap: DocumentSnapshot<Task, TaskDoc> | QueryDocumentSnapshot<Task, TaskDoc>, cryptoKey: CryptoKey) {

    try {

      const value = docSnap.data()?.value;
      const iTask = await decrypt<Task>(value, cryptoKey);

      return new Task(
        value!,
        docSnap.id,
        iTask!.description,
        iTask!.timesOfDay,
        iTask!.daysOfTheWeek,
        docSnap.exists()
      );
    } catch {
      return new Task(
        '',
        '',
        '',
        [],
        [],
        false
      );
    }
  }
}
