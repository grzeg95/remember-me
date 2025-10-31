import {doc, type FirestoreDataConverter, DocumentReference, collection} from 'firebase/firestore';
import {Collections} from './collections';
import {FirestoreUser, FirestoreUserDoc} from './User';

export type RoundDoc = {
  readonly name: string;
  readonly timesOfDay: string[];
  readonly timesOfDayCardinality: number[];
  readonly tasksIds: string[];
}

export type Round = {
  readonly id: string;
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

export function getRoundRef(userRef: DocumentReference<FirestoreUser, FirestoreUserDoc>, id: string) {
  const roundRef = doc(userRef, Collections.rounds, id);
  return roundRef.withConverter(converter);
}

export function getRoundRefs(userRef: DocumentReference<FirestoreUser, FirestoreUserDoc>) {
  const roundsRef = collection(userRef, Collections.rounds);
  return roundsRef.withConverter(converter);
}
