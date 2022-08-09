import {User as FirebaseUser, IdTokenResult} from 'firebase/auth';

export interface User {
  rounds?: string[];
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  emailVerified: boolean;
  cryptoKey?: CryptoKey;
  providerId?: string;
  isAnonymous?: boolean;
  firebaseUser: FirebaseUser,
  idTokenResult: IdTokenResult
}

export interface EncryptedUser {
  rounds: string;
  hasEncryptedSecretKey: boolean;
}
