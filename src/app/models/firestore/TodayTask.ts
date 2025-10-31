import {collection, doc, DocumentReference, FirestoreDataConverter} from 'firebase/firestore';
import {Collections} from './collections';
import {Today, TodayDoc} from './Today';

export type TodayTaskDoc = {
  description: string;
  timesOfDay: {[key in string]: boolean}
};

export type TodayTask = {
  id: string;
} & TodayTaskDoc;

const converter = {
  toFirestore: (todayTask) => ({
    description: todayTask?.description,
    timesOfDay: todayTask?.timesOfDay
  }),
  fromFirestore: (snapshot) => ({
    id: snapshot.id,
    ...snapshot.data()
  })
} as FirestoreDataConverter<TodayTask, TodayTaskDoc>;

export function getTodayTaskRef(todayRef: DocumentReference<Today, TodayDoc>, id: string) {
  return doc(todayRef, Collections.todayTasks, id).withConverter(converter);
}

export function getTodayTaskRefs(todayRef: DocumentReference<Today, TodayDoc>) {
  return collection(todayRef, Collections.todayTasks).withConverter(converter);
}
