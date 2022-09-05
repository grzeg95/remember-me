export {User as FirebaseUser} from 'firebase/auth';

export interface User {
  rounds?: string[];
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  hasCustomPhoto: boolean;
  emailVerified: boolean;
  cryptoKey?: CryptoKey;
  providerId?: string;
  isAnonymous?: boolean;
}

export interface EncryptedUser {
  rounds: string;
  hasEncryptedSecretKey: boolean;
  photoUrl?: string;
}

export interface DecryptedUser {
  rounds: string[];
  hasEncryptedSecretKey: boolean;
  photoUrl?: string;
}
