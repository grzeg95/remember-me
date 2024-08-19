import {
  CollectionReference,
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  onSnapshot,
  Query,
  query,
  QueryConstraint,
  QuerySnapshot,
} from 'firebase/firestore';
export {doc, getDoc} from 'firebase/firestore';
import {Observable} from 'rxjs';

export function docSnapshots<AppModelType, DbModelType extends DocumentData>(reference: DocumentReference<AppModelType, DbModelType>) {
  return fromRef(reference);
}

export function collectionSnapshots<AppModelType, DbModelType extends DocumentData>(reference: CollectionReference<AppModelType, DbModelType>, ...queryConstraints: QueryConstraint[]) {
  return fromRef(query(reference, ...queryConstraints));
}

function fromRef<AppModelType, DbModelType extends DocumentData>(reference: DocumentReference<AppModelType, DbModelType>): Observable<DocumentSnapshot<AppModelType, DbModelType>>;
function fromRef<AppModelType, DbModelType extends DocumentData>(query: Query<AppModelType, DbModelType>): Observable<QuerySnapshot<AppModelType, DbModelType>>;
function fromRef<AppModelType, DbModelType extends DocumentData>(refOrQuery: DocumentReference<AppModelType, DbModelType> | Query<AppModelType, DbModelType>) {

  let ref: DocumentReference<AppModelType, DbModelType>;
  let query: Query<AppModelType, DbModelType>;

  if (refOrQuery instanceof DocumentReference) {
    ref = refOrQuery;
  } else {
    query = refOrQuery;
  }

  return new Observable((subscriber) => {
    const unsubscribe = onSnapshot(ref || query, {includeMetadataChanges: true}, {
      next: (docSnap) => subscriber.next(docSnap),
      error: (firebaseError) => subscriber.error(firebaseError),
      complete: () => subscriber.complete()
    });
    return {unsubscribe};
  });
}
