import {doc, Firestore, type FirestoreDataConverter} from 'firebase/firestore';
import {Collections} from './collections';

export type FirestoreUserDoc = {
  readonly initialized?: boolean;
  readonly isDarkMode?: boolean;
  readonly roundsIds?: string[];
  readonly photoUrl?: string;
}

export type FirestoreUser = {
  readonly uid: string;
} & FirestoreUserDoc;

const converter = {
  toFirestore: (user) => ({
    initialized: user?.initialized,
    isDarkMode: user?.isDarkMode,
    roundsIds: user?.roundsIds
  }),
  fromFirestore: (snapshot) => ({
    uid: snapshot.id,
    ...snapshot.data()
  })
} as FirestoreDataConverter<FirestoreUser, FirestoreUserDoc>;

export function getFirestoreUserRef(firestore: Firestore, id: string) {
  const userRef = doc(firestore, Collections.users, id);
  return userRef.withConverter(converter);
}
