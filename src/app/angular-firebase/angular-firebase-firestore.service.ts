import {Inject, Injectable, NgZone} from '@angular/core';
import {
  collection,
  CollectionReference,
  doc,
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  getDoc,
  onSnapshot,
  Query,
  QuerySnapshot,
  SnapshotListenOptions,
  updateDoc
} from 'firebase/firestore';
import {defer, Observable} from 'rxjs';
import {runInZone} from '../tools';
import {FIRESTORE} from './angular-firebase-injectors';

@Injectable()
export class AngularFirebaseFirestoreService {

  constructor(
    @Inject(FIRESTORE) private readonly firestore: Firestore,
    private ngZone: NgZone
  ) {
  }

  doc(path: string): DocumentReference {
    return doc(this.firestore, path);
  }

  collection(path: string): CollectionReference {
    return collection(this.firestore, path);
  }

  updateDoc$(reference: DocumentReference, data: any): Observable<void> {
    return defer(() => updateDoc(reference, data));
  }

  getDoc$<T>(reference: DocumentReference<T>): Observable<DocumentSnapshot<T>> {
    return defer(() => getDoc(reference));
  }

  docOnSnapshot$<T = DocumentData>(ref: DocumentReference<T>): Observable<DocumentSnapshot<T>> {
    return this.fromRef(ref, {includeMetadataChanges: true});
  }

  collectionOnSnapshot$<T=DocumentData>(query: Query<T>): Observable<QuerySnapshot<T>> {
    return this.fromRef(query, {includeMetadataChanges: true});
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
