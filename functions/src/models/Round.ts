import {DocumentReference, FirestoreDataConverter} from 'firebase-admin/firestore';
import {Collections} from './collections';
import {User, UserDoc} from './User';

export type RoundDoc = {
  name: string;
  timesOfDay: string[];
  timesOfDayCardinality: number[];
  tasksIds: string[];
};

export type Round = {
  id: string;
} & RoundDoc;

const converter = {
  toFirestore: (round) => ({
    name: round?.name,
    timesOfDay: round?.timesOfDay,
    timesOfDayCardinality: round?.timesOfDayCardinality,
    tasksIds: round?.tasksIds
  }),
  fromFirestore: (snapshot) => ({
    id: snapshot.id,
    ...snapshot.data()
  })
} as FirestoreDataConverter<Round, RoundDoc>;

export function getRoundRef(userRef: DocumentReference<User, UserDoc>, id?: string) {

  if (id) {
    return userRef.collection(Collections.rounds).doc(id).withConverter(converter);
  }

  return userRef.collection(Collections.rounds).doc().withConverter(converter);
}
