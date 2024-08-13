import {DocumentData, DocumentSnapshot, Firestore, FirestoreDataConverter} from 'firebase-admin/firestore';
import {decrypt} from '../utils/crypto';
import {Collections} from './collections';

export interface UserDoc extends DocumentData {
  readonly disabled: boolean;
  readonly roundsIds: string[];
  readonly hasEncryptedSecretKey?: boolean;
  readonly encryptedPhotoBlobURL?: string;
}

export class User implements UserDoc {

  private constructor(
    public readonly id: string,
    public readonly disabled: boolean,
    public readonly roundsIds: string[],
    public readonly hasEncryptedSecretKey: boolean,
    public readonly photoBlobURL: string | null,
    public readonly encryptedPhotoBlobURL: string,
    public readonly exists: boolean
  ) {
  }

  static converter = {
    toFirestore: (user: User) => {
      return {
        disabled: user.disabled,
        roundsIds: user.roundsIds,
        hasEncryptedSecretKey: user.hasEncryptedSecretKey,
        encryptedPhotoBlobURL: user.encryptedPhotoBlobURL
      };
    }
  } as FirestoreDataConverter<User, UserDoc>;

  static ref(firestore: Firestore, id: string) {
    return firestore.doc([Collections.users, id].join('/')).withConverter(User.converter);
  }

  static async data(snap: DocumentSnapshot<User, UserDoc>, cryptoKey: CryptoKey) {

    const data = snap.data();

    let disabled = false;
    let roundsIds: string[] = [];
    let hasEncryptedSecretKey = false;
    let encryptedPhotoBlobURL = '';

    data?.['disabled'] && typeof data['disabled'] === 'boolean' && (disabled = data['disabled']);

    if (
      data?.['roundsIds'] &&
      Array.isArray(data['roundsIds']) &&
      !data['roundsIds'].some((e) => typeof e !== 'string')
    ) {
      roundsIds = data['roundsIds'];
    }

    data?.['hasEncryptedSecretKey'] && (typeof data['hasEncryptedSecretKey'] === 'boolean' || data['hasEncryptedSecretKey'] === null) && (hasEncryptedSecretKey = data['hasEncryptedSecretKey']);
    data?.['encryptedPhotoBlobURL'] && typeof data['encryptedPhotoBlobURL'] === 'string' && (encryptedPhotoBlobURL = data['encryptedPhotoBlobURL']);

    const photoBlobURL = await decrypt(encryptedPhotoBlobURL, cryptoKey);

    return new User(
      snap.id,
      disabled,
      roundsIds,
      hasEncryptedSecretKey,
      photoBlobURL,
      encryptedPhotoBlobURL,
      snap.exists
    );
  }
}
