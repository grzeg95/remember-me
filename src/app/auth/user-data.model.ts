import firebase from 'firebase/compat/app';

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
  firebaseUser: firebase.User,
  idTokenResult: firebase.auth.IdTokenResult
}

export interface EncryptedUser {
  rounds: string;
  hasEncryptedSecretKey: boolean;
}
