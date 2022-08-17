import {User as _FirebaseUser} from 'firebase/auth';

export interface FirebaseUser extends _FirebaseUser {}

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
}

export interface EncryptedUser {
  rounds: string;
  hasEncryptedSecretKey: boolean;
}
