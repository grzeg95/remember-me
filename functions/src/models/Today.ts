import {DocumentReference, FirestoreDataConverter} from 'firebase-admin/firestore';
import {Collections} from './collections';
import {Day} from './Day';
import {Round, RoundDoc} from './Round';

export type TodayDoc = {
  todayTasksIds: string[];
};

export type Today = {
  id: string;
} & TodayDoc;

const converter = {
  toFirestore: (today) => ({
    todayTasksIds: today?.todayTasksIds
  }),
  fromFirestore: (snapshot) => ({
    id: snapshot.id,
    ...snapshot.data()
  })
} as FirestoreDataConverter<Today, TodayDoc>;

export function getTodayRef(roundRef: DocumentReference<Round, RoundDoc>, id?: Day) {

  if (id) {
    return roundRef.collection(Collections.todays).doc(id).withConverter(converter);
  }

  return roundRef.collection(Collections.todays).doc().withConverter(converter);
}
