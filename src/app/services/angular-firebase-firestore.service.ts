import {Injectable, NgZone} from '@angular/core';
import {
  collection,
  doc,
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  FieldPath,
  Firestore,
  getDoc,
  onSnapshot,
  query,
  Query,
  QueryConstraint,
  QueryDocumentSnapshot,
  QuerySnapshot,
  SnapshotOptions,
  updateDoc
} from '@angular/fire/firestore';
import {defer, Observable} from 'rxjs';
import {runInZone} from '../utils/tools';


@Injectable()
export class AngularFirebaseFirestoreService {

  constructor(
    private firestore: Firestore,
    private ngZone: NgZone
  ) {
  }

  private doc<T = DocumentData>(path: string): DocumentReference<T> {
    return this.withConverter<T>(doc(this.firestore, path));
  }

  updateDoc(path: string, data: any): Observable<void>
  updateDoc(path: string, field: string | FieldPath, value: unknown, ...moreFieldsAndValues: unknown[]): Observable<void>
  updateDoc(path: string, ...data: any): Observable<void> {
    // @ts-ignore
    return defer(() => updateDoc(this.doc(path), ...data));
  }

  getDoc<T = DocumentData>(path: string): Observable<DocumentSnapshot<T>> {
    return defer(() => getDoc(this.doc<T>(path)));
  }

  docOnSnapshot<T = DocumentData>(path: string): Observable<DocumentSnapshot<T>> {
    return this.fromRef(this.doc<T>(path));
  }

  private query<T = DocumentData>(path: string, ...queryConstraints: QueryConstraint[]): Query<T> {
    return this.withConverter<T>(query(collection(this.firestore, path), ...queryConstraints));
  }

  collectionOnSnapshot<T = DocumentData>(path: string, ...queryConstraints: QueryConstraint[]): Observable<QuerySnapshot<T>> {
    return this.fromRef<T>(this.query<T>(path, ...queryConstraints));
  }

  private withConverter<T = DocumentData>(reference: DocumentReference): DocumentReference<T>;
  private withConverter<T = DocumentData>(reference: Query): Query<T>;
  private withConverter<T = DocumentData>(reference: any) {

    return reference.withConverter({
      toFirestore(t: T): T {
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
