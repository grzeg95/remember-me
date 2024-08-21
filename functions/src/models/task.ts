import {
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  FirestoreDataConverter,
  QueryDocumentSnapshot
} from 'firebase-admin/firestore';
import {BasicEncryptedValue, decrypt} from '../utils/crypto';
import {Collection} from './collections';
import {Day} from './day';
import {Round} from './round';

export type TaskDoc = BasicEncryptedValue | DocumentData;

export class Task {

  constructor(
    public readonly value: string,
    public readonly id: string,
    public description: string,
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
      } as TaskDoc;
    }
  } as FirestoreDataConverter<Task>;

  static ref(roundRef: DocumentReference<Round>, id?: string) {

    if (id) {
      return roundRef.firestore.doc([roundRef.path, Collection.task, id].join('/')).withConverter(Task._converter);
    }

    return roundRef.firestore.collection([roundRef.path, Collection.task].join('/')).doc().withConverter(Task._converter);
  }

  static refs(roundRef: DocumentReference<Round>) {
    return roundRef.firestore.collection([roundRef.path, Collection.task].join('/')).withConverter(Task._converter);
  }

  static async data(docSnap: DocumentSnapshot<Task> | QueryDocumentSnapshot<Task>, cryptoKey: CryptoKey) {

    try {

      const value = docSnap.data()?.value;
      const iTask = await decrypt<Task>(value, cryptoKey);

      return new Task(
        value!,
        docSnap.id,
        iTask!.description,
        iTask!.timesOfDay,
        iTask!.daysOfTheWeek,
        docSnap.exists
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
