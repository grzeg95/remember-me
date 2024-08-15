import {doc, DocumentData, DocumentReference, QueryDocumentSnapshot, DocumentSnapshot, FirestoreDataConverter, collection} from 'firebase/firestore';
import {decrypt, protectObjectDecryption} from '../utils/crypto';
import {Collections} from './collections';
import {Round, RoundDoc} from './round';

export interface TodayDoc extends DocumentData {
  readonly encryptedName: string;
  readonly todayTasksIds: string[];
}

export class Today implements TodayDoc {

  private constructor(
    public readonly id: string,
    public readonly encryptedName: string,
    public readonly name: string,
    public readonly todayTasksIds: string[],
    public readonly exists: boolean
  ) {
  }

  private static _converter = {
    toFirestore: (today: Today) => {
      return {
        encryptedName: today.encryptedName,
        todayTasksIds: today.todayTasksIds
      };
    },
    fromFirestore(snapshot: QueryDocumentSnapshot) {
      return snapshot.data();
    }
  } as FirestoreDataConverter<Today, TodayDoc>;

  static ref(roundRef: DocumentReference<Round, RoundDoc>, id?: string) {

    if (id) {
      return doc(roundRef, Collections.today, id).withConverter(Today._converter);
    }

    return collection(roundRef, Collections.today).withConverter(Today._converter);
  }

  static async data(snap: DocumentSnapshot<Today, TodayDoc> | QueryDocumentSnapshot<Today, TodayDoc>, cryptoKey: CryptoKey) {

    const data = snap.data();

    let encryptedName: string = '';
    let tasksIds: string[] = [];

    data?.['encryptedName'] && typeof data['encryptedName'] === 'string' && (encryptedName = data['encryptedName']);

    if (
      data?.['todayTasksIds'] &&
      Array.isArray(data['todayTasksIds']) &&
      !data['todayTasksIds'].some((e) => typeof e !== 'string')
    ) {
      tasksIds = data['todayTasksIds'];
    }

    const name = await decrypt<string>(encryptedName, cryptoKey).then(protectObjectDecryption<string>(''));

    return new Today(
      snap.id,
      encryptedName,
      name,
      tasksIds,
      snap.exists()
    );
  }
}
