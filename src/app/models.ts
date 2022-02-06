export interface UserRememberedIndexedDB {
  email: string;
  isAnonymous: boolean;
  displayName: string;
  providerId: string;
  lastSignInTime: string;
}

export interface UserRemembered extends UserRememberedIndexedDB {
  id: string;
}
