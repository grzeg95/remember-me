export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  emailVerified: boolean;
  symmetricKey?: {
    string?: string;
    cryptoKey?: CryptoKey;
  };
}

export interface User {
  rounds: string[];
}

export interface EncryptedUser {
  rounds: string;
  hasSymmetricKey: boolean;
}
