import {DocumentReference, FirestoreDataConverter} from 'firebase-admin/firestore';
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

export function getTodayTaskRef(todayRef: DocumentReference<Today, TodayDoc>, id?: string) {

  if (id) {
    return todayRef.collection(Collections.todayTasks).doc(id).withConverter(converter);
  }

  return todayRef.collection(Collections.todayTasks).doc().withConverter(converter);
}
