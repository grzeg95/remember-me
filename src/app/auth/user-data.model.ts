export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  emailVerified: boolean;
  cryptoKey?: CryptoKey;
  providerId?: string;
  isAnonymous?: boolean;
}

export interface User {
  rounds: string[];
}

export interface EncryptedUser {
  rounds: string;
  hasSymmetricKey: boolean;
  cryptoKeyTest: string;
}
