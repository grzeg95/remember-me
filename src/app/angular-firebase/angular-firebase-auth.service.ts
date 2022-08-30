import {Inject, Injectable, NgZone} from '@angular/core';
import {FirebaseUser} from 'auth';
import {
  Auth,
  AuthProvider,
  beforeAuthStateChanged,
  createUserWithEmailAndPassword,
  deleteUser,
  getIdToken,
  getIdTokenResult,
  IdTokenResult,
  onAuthStateChanged,
  onIdTokenChanged,
  PopupRedirectResolver,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signOut,
  Unsubscribe,
  updatePassword,
  UserCredential
} from 'firebase/auth';
import {catchError, defer, map, Observable} from 'rxjs';
import {runInZone} from '../tools';
import {AUTH} from './angular-firebase-injectors';

@Injectable()
export class AngularFirebaseAuthService {

  constructor(
    @Inject(AUTH) private readonly auth: Auth,
    private ngZone: NgZone
  ) {
  }

  beforeAuthStateChanged(callback: (user: FirebaseUser) => (void | Promise<void>), onAbort?: () => void): Unsubscribe {
    return beforeAuthStateChanged(
      this.auth,
      this.ngZone.run(() => callback),
      this.ngZone.run(() => onAbort)
    );
  }

  onAuthStateChanged$(): Observable<FirebaseUser> {
    return new Observable<FirebaseUser>((subscriber) => {
      const unsubscribe = this.ngZone.run(() => onAuthStateChanged(this.auth,
        subscriber.next.bind(subscriber),
        subscriber.error.bind(subscriber),
        subscriber.complete.bind(subscriber)
      ));
      return {unsubscribe};
    }).pipe(runInZone(this.ngZone));
  }

  user$(): Observable<any> {
    return new Observable((subscriber) => {
      const unsubscribe = this.ngZone.run(() => onIdTokenChanged(this.auth,
        subscriber.next.bind(subscriber),
        subscriber.error.bind(subscriber),
        subscriber.complete.bind(subscriber)
      ));
      return {unsubscribe};
    }).pipe(runInZone(this.ngZone));
  }

  reload$(user: FirebaseUser, callback?: () => void): Observable<void> {
    return defer(() => reload(user).then(() => callback()));
  }

  signInWithRedirect$(provider: AuthProvider, resolver?: PopupRedirectResolver): Observable<void> {
    return defer(() => signInWithRedirect(this.auth, provider, resolver));
  }

  signInWithCustomToken$(customToken: string): Observable<UserCredential> {
    return defer(() => signInWithCustomToken(this.auth, customToken));
  }

  signInAnonymously$(): Observable<UserCredential> {
    return defer(() => signInAnonymously(this.auth));
  }

  signInWithEmailAndPassword$(email: string, password: string): Observable<UserCredential | void> {
    return defer(() => signInWithEmailAndPassword(this.auth, email, password));
  }

  createUserWithEmailAndPassword$(email: string, password: string): Observable<UserCredential> {
    return defer(() => createUserWithEmailAndPassword(this.auth, email, password));
  }

  sendEmailVerification$(firebaseUser: FirebaseUser): Observable<void> {
    return defer(() => sendEmailVerification(firebaseUser));
  }

  sendPasswordResetEmail$(email: string): Observable<void> {
    return defer(() => sendPasswordResetEmail(this.auth, email));
  }

  signOut$(): Observable<void> {
    return defer(() => signOut(this.auth));
  }

  updatePassword$(firebaseUser: FirebaseUser, newPassword: string): Observable<{code: string; message: string}> {

    return defer(() => updatePassword(firebaseUser, newPassword)).pipe(
      catchError(((error: {code: string, message: string}) => {

        if (error.code === 'auth/weak-password') {
          error.message = 'Password should has at least 6 characters 😩';
        }

        throw error;
      })),
      map(() => {
        return {
          code: 'auth/password-updated',
          message: 'Password has been updated 🤫'
        }
      })
    );
  }

  getIdTokenResult$(firebaseUser: FirebaseUser, forceRefresh?: boolean): Observable<IdTokenResult> {
    return defer(() => getIdTokenResult(firebaseUser, forceRefresh));
  }

  getIdToken$(firebaseUser: FirebaseUser, forceRefresh?: boolean) {
    return defer(() => getIdToken(firebaseUser, forceRefresh));
  }

  deleteUser$(firebaseUser: FirebaseUser): Observable<void> {
    return defer(() => deleteUser(firebaseUser));
  }
}
