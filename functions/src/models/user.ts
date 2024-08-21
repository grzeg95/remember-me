import {
  DocumentData,
  DocumentSnapshot,
  Firestore,
  FirestoreDataConverter,
  QueryDocumentSnapshot
} from 'firebase-admin/firestore';
import {decrypt} from '../utils/crypto';
import {Collection} from './collections';

export type UserDoc = {
  readonly rounds?: string;
  readonly hasEncryptedSecretKey?: boolean;
  readonly photoURL?: string;
} | DocumentData;

export class User {

  constructor(
    public readonly id: string,
    public readonly rounds: string,
    public readonly decryptedRounds: string[],
    public readonly hasEncryptedSecretKey: boolean,
    public photoURL: string,
    public readonly disabled: boolean,
    public readonly exists: boolean
  ) {
  }

  private static _converter = {
    fromFirestore(snap: QueryDocumentSnapshot) {
      return snap.data();
    },
    toFirestore(user: User) {
      return {
        rounds: user.rounds,
        hasEncryptedSecretKey: user.hasEncryptedSecretKey,
        photoURL: user.photoURL
      } as UserDoc;
    }
  } as FirestoreDataConverter<User>;

  static ref(firestore: Firestore, id: string) {
    return firestore.doc([Collection.users, id].join('/')).withConverter(User._converter);
  }

  static async data(docSnap: DocumentSnapshot<User>, cryptoKey: CryptoKey) {

    try {

      const data = docSnap.data();

      const decryptedRounds = await decrypt<string[]>(data!.rounds, cryptoKey);
      const decryptedPhotoURL = await decrypt<string>(data!.photoURL, cryptoKey);

      return new User(
        docSnap.id,
        data!.rounds,
        decryptedRounds!,
        data!.hasEncryptedSecretKey,
        decryptedPhotoURL!,
        !!data!.disabled,
        docSnap.exists
      );

    } catch {
      return new User(
        '',
        '',
        [],
        false,
        '',
        false,
        false
      );
    }
  }
}
