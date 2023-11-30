import {User as FirebaseUser} from 'firebase/auth';
export {FirebaseUser};

export interface User {
  rounds: string[];
  photoURL: string | null;
  hasCustomPhoto: boolean;
  cryptoKey: CryptoKey;
  providerId?: string;
  isAnonymous?: boolean;
  firebaseUser: FirebaseUser;
}

export interface EncryptedUser {
  rounds?: string;
  hasEncryptedSecretKey?: boolean;
  photoURL?: string;
}

export interface DecryptedUser {
  rounds: string[];
  hasEncryptedSecretKey: boolean;
  photoURL?: string;
}
