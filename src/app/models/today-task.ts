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
  encryptedTimeOfDayIntoDoneMap: { [key in string]: boolean };
}

export class TodayTask implements TodayTaskDoc {

  private constructor(
    public readonly id: string,
    public readonly encryptedDescription: string,
    public readonly description: string,
    public readonly encryptedTimeOfDayIntoTimeOfDayMap: {[key in string]: string},
    public readonly encryptedTimeOfDayIntoDoneMap: {[key in string]: boolean},
    public readonly exists: boolean
  ) {
  }

  private static _converter = {
    toFirestore: (todayTask: TodayTask) => {
      return {
        encryptedDescription: todayTask.encryptedDescription,
        encryptedTimeOfDayIntoDoneMap: todayTask.encryptedTimeOfDayIntoDoneMap
      };
    },
    fromFirestore(snapshot: QueryDocumentSnapshot) {
      return snapshot.data();
    }
  } as FirestoreDataConverter<TodayTask, TodayTaskDoc>;

  static ref(todayRef: DocumentReference<Today, TodayDoc>, id?: string) {

    if (id) {
      return doc(todayRef, [Collections.todayTask, id].join('/')).withConverter(TodayTask._converter);
    }

    return collection(todayRef, [Collections.todayTask].join('/')).withConverter(TodayTask._converter);
  }

  static async data(snap: DocumentSnapshot<TodayTask, TodayTaskDoc> | QueryDocumentSnapshot<TodayTask, TodayTaskDoc>, cryptoKey: CryptoKey) {

    const data = snap.data();

    let encryptedDescription = '';
    let encryptedTimeOfDayIntoDoneMap: { [key in string]: boolean } = {};

    data?.['encryptedDescription'] && typeof data['encryptedDescription'] === 'string' && (encryptedDescription = data['encryptedDescription']);
    data?.['encryptedTimeOfDayIntoDoneMap'] && typeof data['encryptedTimeOfDayIntoDoneMap'] === 'string' && (encryptedTimeOfDayIntoDoneMap = data['encryptedTimeOfDayIntoDoneMap']);

    if (
      data?.['encryptedTimeOfDayIntoDoneMap'] &&
      !Array.isArray(data['encryptedTimeOfDayIntoDoneMap']) &&
      typeof data['encryptedTimeOfDayIntoDoneMap'] === 'object'
    ) {
      encryptedTimeOfDayIntoDoneMap = data['encryptedTimeOfDayIntoDoneMap'];
    }

    const description = await decrypt<string>(encryptedDescription, cryptoKey).then(protectObjectDecryption<string>(''));

    const encryptedTimeOfDayIntoTimeOfDayMap: { [key in string]: string } = {};

    for (const encryptedTimeOfDayIntoDoneMapKey of Object.getOwnPropertyNames(encryptedTimeOfDayIntoDoneMap)) {
      encryptedTimeOfDayIntoTimeOfDayMap[encryptedTimeOfDayIntoDoneMapKey] = await decrypt(encryptedTimeOfDayIntoDoneMapKey, cryptoKey) || '';
    }

    return new TodayTask(
      snap.id,
      encryptedDescription,
      description,
      encryptedTimeOfDayIntoTimeOfDayMap,
      encryptedTimeOfDayIntoDoneMap,
      snap.exists()
    );
  }
}
