import {DocumentReference, FirestoreDataConverter} from 'firebase-admin/firestore';
import {Collections} from './collections';
import {Day} from './Day';
import {Round, RoundDoc} from './Round';

export type TaskDoc = {
  description: string;
  days: Day[];
  timesOfDay: string[];
};

export type Task = {
  id: string;
} & TaskDoc;

const converter = {
  toFirestore: (task) => ({
    description: task?.description,
    days: task?.days,
    timesOfDay: task?.timesOfDay
  }),
  fromFirestore: (snapshot) => ({
    id: snapshot.id,
    ...snapshot.data()
  })
} as FirestoreDataConverter<Task, TaskDoc>;

export function getTaskRef(roundRef: DocumentReference<Round, RoundDoc>, id?: string) {

  if (id) {
    return roundRef.collection(Collections.tasks).doc(id).withConverter(converter);
  }

  return roundRef.collection(Collections.tasks).doc().withConverter(converter);
}
