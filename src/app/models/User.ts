import {FirestoreUser} from './firestore/User';

export type User = {
  photoURL: string | null;
} & FirestoreUser;
