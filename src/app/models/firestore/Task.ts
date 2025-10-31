import {doc, DocumentReference, type FirestoreDataConverter, collection} from 'firebase/firestore';
import {Collections} from './collections';
import {Day} from './Day';
import {Round, RoundDoc} from './Round';

export type TaskDoc = {
  readonly description: string;
  readonly days: Day[];
  readonly timesOfDay: string[];
}

export type Task = {
  readonly id: string;
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

export function getTaskRef(roundRef: DocumentReference<Round, RoundDoc>, id: string) {
  const taskRef = doc(roundRef, Collections.tasks, id);
  return taskRef.withConverter(converter);
}

export function getTaskRefs(roundRef: DocumentReference<Round, RoundDoc>) {
  const taskRefs = collection(roundRef, Collections.tasks);
  return taskRefs.withConverter(converter);
}
