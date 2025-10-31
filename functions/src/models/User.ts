import {Firestore, FirestoreDataConverter} from 'firebase-admin/firestore';
import {Collections} from './collections';

export type UserDoc = {
  initialized?: boolean;
  isDarkMode?: boolean;
  roundsIds?: string[];
  photoUrl?: string;
};

export type User = {
  readonly uid: string;
} & UserDoc;

const converter = {
  toFirestore: (user) => {
    return {
      initialized: user?.initialized,
      isDarkMode: user?.isDarkMode,
      roundsIds: user?.roundsIds,
      photoUrl: user?.photoUrl
    };
  },
  fromFirestore: (snapshot) => ({
    uid: snapshot.id,
    ...snapshot.data()
  })
} as FirestoreDataConverter<User, UserDoc>;

export function getUserRef(firestore: Firestore, id: string) {
  return firestore.collection(Collections.users).doc(id).withConverter(converter);
}
