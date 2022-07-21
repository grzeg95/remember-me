import firebase from 'firebase/compat';

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
  firebaseUser: firebase.User
}

export interface EncryptedUser {
  rounds: string;
  cryptoKeyTest: string;
}
