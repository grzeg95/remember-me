import {Inject, Injectable, NgZone} from '@angular/core';
import {FieldPath} from '@firebase/firestore';
import {
  collection,
  doc,
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  getDoc,
  limit,
  onSnapshot,
  query,
  Query,
  QueryDocumentSnapshot,
  QuerySnapshot,
  SnapshotListenOptions,
  SnapshotOptions,
  updateDoc
} from 'firebase/firestore';
import {defer, Observable} from 'rxjs';
import {FIRESTORE} from './angular-firebase-injectors';
import {runInZone} from './tools';

@Injectable()
export class AngularFirebaseFirestoreService {

  constructor(
    @Inject(FIRESTORE) private readonly firestore: Firestore,
    private ngZone: NgZone
  ) {
  }

  private doc<T>(path: string): DocumentReference<T> {
    return this.withConverter(doc(this.firestore, path));
  }

  updateDoc$(path: string, data: any): Observable<void>
  updateDoc$(path: string, field: string | FieldPath, value: unknown, ...moreFieldsAndValues: unknown[]): Observable<void>
  updateDoc$(path: string, ...any: any): Observable<void> {
    // @ts-ignore
    return defer(() => updateDoc(this.doc(path), ...any));
  }

  getDoc$<T = DocumentData>(path: string): Observable<DocumentSnapshot<T>> {
    return defer(() => getDoc(this.withConverter<T>(this.doc(path))));
  }

  docOnSnapshot$<T = DocumentData>(path: string): Observable<DocumentSnapshot<T>> {
    return this.fromRef(this.withConverter<T>(this.doc(path)), {includeMetadataChanges: true});
  }

  private query<T = DocumentData>(path: string, options?: {limit?: number}): Query<T> {

    let _query: Query;

    if (options?.limit) {
      _query = query(collection(this.firestore, path), limit(options.limit));
    } else {
      _query = query(collection(this.firestore, path));
    }

    return this.withConverter<T>(_query);
  }

  collectionOnSnapshot$<T = DocumentData>(path: string, options?: {limit?: number}): Observable<QuerySnapshot<T>> {
    return this.fromRef(this.query<T>(path, options), {includeMetadataChanges: true});
  }

  private withConverter<T>(reference: DocumentReference): DocumentReference<T>;
  private withConverter<T>(reference: Query): Query<T>;
  private withConverter<T>(reference: any) {

    return reference.withConverter({
      toFirestore(t: T): DocumentData {
        return structuredClone(t);
      },
      fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
        return snapshot.data(options)! as T;
      }
    });
  }

  private fromRef<T = DocumentData>(ref: DocumentReference<T>, options?: SnapshotListenOptions): Observable<DocumentSnapshot<T>>;
  private fromRef<T = DocumentData>(ref: Query<T>, options?: SnapshotListenOptions): Observable<QuerySnapshot<T>>;
  private fromRef(ref: any, options: SnapshotListenOptions = {includeMetadataChanges: false}): Observable<any> {
    return new Observable((subscriber) => {
      const unsubscribe = onSnapshot(ref, options, {
        next: subscriber.next.bind(subscriber),
        error: subscriber.error.bind(subscriber),
        complete: subscriber.complete.bind(subscriber),
      });
      return {unsubscribe};
    }).pipe(runInZone(this.ngZone));
  }
}
