import {inject, Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  updatePassword,
  User
} from 'firebase/auth';
import {catchError, defer, from, map, Observable, of, shareReplay, switchMap, throwError} from 'rxjs';
import {filter} from 'rxjs/operators';
import {FirestoreUser, getFirestoreUserRef} from '../models/firestore/User';
import {AuthInjectionToken, FirestoreInjectionToken} from '../tokens/firebase';
import {docSnapshots} from '../utils/firestore';

@Injectable({
  providedIn: 'root'
})
export class Auth {

  private _router = inject(Router);
  private _auth = inject(AuthInjectionToken);
  private _firestore = inject(FirestoreInjectionToken);

  authStateReady$ = from(
    this._auth.authStateReady().then(() => true)
  ).pipe(
    filter((ready) => ready),
    shareReplay({bufferSize: 1, refCount: true})
  );

  authUser$ = this.authStateReady$.pipe(
    switchMap((ready) => {

      if (!ready) {
        return of(undefined);
      }

      return new Observable<User | null>((subscriber) => {
        const unsubscribe = onAuthStateChanged(this._auth, {
          next: subscriber.next.bind(subscriber),
          error: subscriber.error.bind(subscriber),
          complete: subscriber.complete.bind(subscriber)
        });
        return {unsubscribe};
      })
    }),
    catchError((e) => {
      console.error(e);
      throw e;
    }),
    shareReplay({bufferSize: 1, refCount: true})
  )

  firestoreUser$ = this.authUser$.pipe(
    switchMap((user) => {

      if (user) {

        const userRef = getFirestoreUserRef(this._firestore, user.uid);

        return docSnapshots(userRef).pipe(
          catchError((e) => {
            console.error(e);
            throw e;
          }),
          map((firebaseUserSnap) => {

            return {
              ...firebaseUserSnap.data(),
              uid: user.uid,
              photoURL: user!.photoURL
            } as FirestoreUser
          })
        );
      }
      return of(null);
    }),
    shareReplay({bufferSize: 1, refCount: true})
  );

  userInitialized$ = this.firestoreUser$.pipe(map(user => user !== undefined));
  userLoggedIn$ = this.firestoreUser$.pipe(map(user => !!user));

  signInWithEmailAndPassword$(email: string, password: string) {
    return defer(() => signInWithEmailAndPassword(this._auth, email, password));
  }

  signInAnonymously$() {
    return defer(() => signInAnonymously(this._auth));
  }

  signInWithGoogle$() {
    return defer(() => {
      return signInWithPopup(this._auth, new GoogleAuthProvider());
    });
  }

  sendPasswordResetEmail$(email: string) {
    return defer(() => sendPasswordResetEmail(this._auth, email));
  }

  createUserWithEmailAndPassword$(email: string, password: string) {
    return defer(() => createUserWithEmailAndPassword(this._auth, email, password));
  }

  signOut() {
    return this._auth.signOut().then(() => {
      this._router.navigate(['/']);
    });
  }

  deleteUser$() {
    return defer(() => {

      if (!this._auth.currentUser) {
        return throwError(() => new Error('no user'));
      }

      return this._auth.currentUser.delete();
    });
  }

  updatePassword(newPassword: string) {

    return defer(() => {

      const firebaseUser = this._auth.currentUser;

      if (!firebaseUser || firebaseUser!.providerData[0]?.providerId !== 'password') {
        throw {
          code: 'auth/unauthorized',
          message: `Password hasn't been updated 🤫`
        }
      }

      return updatePassword(firebaseUser!, newPassword).then(() => {
        return {
          code: 'auth/password-updated',
          message: 'Password has been updated 🤫'
        }
      });

    });
  }
}
