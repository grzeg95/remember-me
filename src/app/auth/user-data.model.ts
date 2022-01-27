export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  emailVerified: boolean;
  symmetricKey?: string;
}

export interface User {
  rounds: string[];
}

export interface EncryptedUser {
  rounds: string;
  hasSymmetricKey: boolean;
}
