import {
  collection,
  doc,
  DocumentData,
  DocumentSnapshot,
  Firestore,
  FirestoreDataConverter,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import {User as FirebaseUser} from 'firebase/auth';
import {decrypt} from '../utils/crypto';
import {Collection} from './collections';

export type UserDoc = {
  readonly rounds?: string;
  readonly hasEncryptedSecretKey?: boolean;
  readonly photoURL?: string;
} & DocumentData;

export class User implements UserDoc {

  private _hasCustomPhoto = false;

  get hasCustomPhoto() {
    return this._hasCustomPhoto;
  }

  set hasCustomPhoto(hasCustomPhoto: boolean) {
    this._hasCustomPhoto = hasCustomPhoto;
  }

  constructor(
    public readonly id: string,
    public readonly rounds: string,
    public readonly decryptedRounds: string[],
    public readonly hasEncryptedSecretKey: boolean,
    public photoURL: string,
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
      } as UserDoc
    }
  } as FirestoreDataConverter<User, UserDoc>;

  static ref(firestore: Firestore, id: string) {
    return doc(firestore, [Collection.users, id].join('/')).withConverter(User._converter);
  }

  static async data(docSnap: DocumentSnapshot<User, UserDoc>, cryptoKey: CryptoKey) {

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
        docSnap.exists()
      );

    } catch {
      return new User(
        '',
        '',
        [],
        false,
        '',
        false
      );
    }
  }
}
