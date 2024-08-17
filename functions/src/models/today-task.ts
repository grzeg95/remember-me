import {QueryDocumentSnapshot, DocumentData, FirestoreDataConverter, DocumentReference, DocumentSnapshot} from 'firebase-admin/firestore';
import {decrypt, protectObjectDecryption} from '../utils/crypto';
import {Collections} from './collections';
import {Today, TodayDoc} from './today';

export interface TodayTaskDoc extends DocumentData{
  encryptedDescription: string;
  encryptedTimesOfDayIds: string;
}

export class TodayTask implements TodayTaskDoc {

  private constructor(
    public readonly id: string,
    public readonly encryptedDescription: string,
    public readonly description: string,
    public readonly encryptedTimesOfDayIds: string,
    public readonly timesOfDay: {[key in string]: boolean},
    public readonly exists: boolean
  ) {
  }

  private static _converter = {
    toFirestore: (todayTask: TodayTask) => {
      return {
        encryptedDescription: todayTask.encryptedDescription,
        encryptedTimesOfDayIds: todayTask.encryptedTimesOfDayIds
      };
    },
    fromFirestore(snap: FirebaseFirestore.QueryDocumentSnapshot) {
      return snap.data();
    }
  } as FirestoreDataConverter<TodayTask, TodayTaskDoc>;

  static ref(todayRef: DocumentReference<Today, TodayDoc>, id: string) {
    return todayRef.firestore.doc([todayRef.path, Collections.todayTask, id].join('/')).withConverter(TodayTask._converter);
  }

  static refs(todayRef: DocumentReference<Today, TodayDoc>) {
    return todayRef.firestore.collection([todayRef.path, Collections.todayTask].join('/')).withConverter(TodayTask._converter);
  }

  static async data(snap: DocumentSnapshot<TodayTask, TodayTaskDoc> | QueryDocumentSnapshot<TodayTask, TodayTaskDoc>, cryptoKey: CryptoKey) {

    const data = snap.data();

    let encryptedDescription = '';
    let encryptedTimesOfDayIds = '';

    data?.['encryptedDescription'] && typeof data['encryptedDescription'] === 'string' && (encryptedDescription = data['encryptedDescription']);
    data?.['encryptedTimesOfDayIds'] && typeof data['encryptedTimesOfDayIds'] === 'string' && (encryptedTimesOfDayIds = data['encryptedTimesOfDayIds']);

    const description = await decrypt<string>(encryptedDescription, cryptoKey).then(protectObjectDecryption<string>(''));
    const timesOfDay = await decrypt<{[key in string]: boolean}>(encryptedTimesOfDayIds, cryptoKey).then(protectObjectDecryption<{[key in string]: boolean}>({}));

    return new TodayTask(
      snap.id,
      encryptedDescription,
      description,
      encryptedTimesOfDayIds,
      timesOfDay,
      snap.exists
    );
  }
}
