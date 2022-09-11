import {Inject, Injectable, NgZone} from '@angular/core';
import {FieldPath, QueryConstraint} from '@firebase/firestore';
import {
  collection,
  doc,
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  getDoc,
  onSnapshot,
  query,
  Query,
  QueryDocumentSnapshot,
  QuerySnapshot,
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

  private doc<T = DocumentData>(path: string): DocumentReference<T> {
    return this.withConverter<T>(doc(this.firestore, path));
  }

  updateDoc$(path: string, data: any): Observable<void>
  updateDoc$(path: string, field: string | FieldPath, value: unknown, ...moreFieldsAndValues: unknown[]): Observable<void>
  updateDoc$(path: string, ...any: any): Observable<void> {
    // @ts-ignore
    return defer(() => updateDoc(this.doc(path), ...any));
  }

  getDoc$<T = DocumentData>(path: string): Observable<DocumentSnapshot<T>> {
    return defer(() => getDoc(this.doc<T>(path)));
  }

  docOnSnapshot$<T = DocumentData>(path: string): Observable<DocumentSnapshot<T>> {
    return this.fromRef(this.doc<T>(path));
  }

  private query<T = DocumentData>(path: string, ...queryConstraints: QueryConstraint[]): Query<T> {
    return this.withConverter<T>(query(collection(this.firestore, path), ...queryConstraints));
  }

  collectionOnSnapshot$<T = DocumentData>(path: string, ...queryConstraints: QueryConstraint[]): Observable<QuerySnapshot<T>> {
    return this.fromRef<T>(this.query<T>(path, ...queryConstraints));
  }

  private withConverter<T = DocumentData>(reference: DocumentReference): DocumentReference<T>;
  private withConverter<T = DocumentData>(reference: Query): Query<T>;
  private withConverter<T = DocumentData>(reference: any) {

    return reference.withConverter({
      toFirestore(t: T): DocumentData {
        return structuredClone(t);
      },
      fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
        return snapshot.data(options)! as T;
      }
    });
  }

  private fromRef<T = DocumentData>(ref: DocumentReference<T>): Observable<DocumentSnapshot<T>>;
  private fromRef<T = DocumentData>(ref: Query<T>): Observable<QuerySnapshot<T>>;
  private fromRef(ref: any): Observable<any> {
    return new Observable((subscriber) => {
      const unsubscribe = onSnapshot(ref, {includeMetadataChanges: true}, {
        next: subscriber.next.bind(subscriber),
        error: subscriber.error.bind(subscriber),
        complete: subscriber.complete.bind(subscriber),
      });
      return {unsubscribe};
    }).pipe(runInZone(this.ngZone));
  }
}
