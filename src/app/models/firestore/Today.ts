import {collection, doc, DocumentReference, type FirestoreDataConverter} from 'firebase/firestore';
import {Collections} from './collections';
import {Round, RoundDoc} from './Round';

export type TodayDoc = {
  readonly todayTasksIds: string[];
}

export type Today = {
  readonly id: string;
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

export function getTodayRef(roundRef: DocumentReference<Round, RoundDoc>, id: string) {
  return doc(roundRef, Collections.todays, id).withConverter(converter);
}

export function getTodayRefs(roundRef: DocumentReference<Round, RoundDoc>) {
  return collection(roundRef, Collections.todays).withConverter(converter);
}
