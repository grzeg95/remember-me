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
import {Today, TodayDoc} from './today';

export interface TodayTaskDoc extends DocumentData {
  encryptedDescription: string;
  encryptedTimesOfDay: string;
}

export class TodayTask implements TodayTaskDoc {

  private constructor(
    public readonly id: string,
    public readonly encryptedDescription: string,
    public readonly description: string,
    public readonly encryptedTimesOfDay: string,
    public readonly timesOfDay: { [key in string]: boolean },
    public readonly exists: boolean
  ) {
  }

  private static _converter = {
    toFirestore: (todayTask: TodayTask) => {
      return {
        encryptedDescription: todayTask.encryptedDescription,
        encryptedTimesOfDay: todayTask.encryptedTimesOfDay
      };
    }
  } as FirestoreDataConverter<TodayTask, TodayTaskDoc>;

  static ref(todayRef: DocumentReference<Today, TodayDoc>, id?: string) {

    if (id) {
      return doc(todayRef, Collections.todayTask, id).withConverter(TodayTask._converter);
    }

    return collection(todayRef, Collections.todayTask).withConverter(TodayTask._converter);
  }

  static async data(snap: DocumentSnapshot<TodayTask, TodayTaskDoc> | QueryDocumentSnapshot<TodayTask, TodayTaskDoc>, cryptoKey: CryptoKey) {

    const data = snap.data();

    let encryptedDescription: string = '';
    let encryptedTimesOfDay: string = '';

    data?.['encryptedDescription'] && typeof data['encryptedDescription'] === 'string' && (encryptedDescription = data['encryptedDescription']);
    data?.['encryptedTimesOfDay'] && typeof data['encryptedTimesOfDay'] === 'string' && (encryptedTimesOfDay = data['encryptedTimesOfDay']);

    const description = await decrypt<string>(encryptedDescription, cryptoKey).then(protectObjectDecryption<string>(''));
    const timesOfDay = await decrypt<{ [key in string]: boolean }>(encryptedTimesOfDay, cryptoKey).then(protectObjectDecryption<{ [key in string]: boolean }>({}));

    return new TodayTask(
      snap.id,
      encryptedDescription,
      description,
      encryptedTimesOfDay,
      timesOfDay,
      snap.exists()
    );
  }
}
