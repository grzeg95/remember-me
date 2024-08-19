import {Inject, Injectable} from '@angular/core';
import {
  Auth,
  AuthProvider,
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  PopupRedirectResolver,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signOut,
  updatePassword,
  User as FirebaseUser,
  UserCredential
} from 'firebase/auth';
import {catchError, defer, map, Observable, shareReplay} from 'rxjs';
import {AuthInjectionToken} from '../models/firebase';

@Injectable()
export class AngularFirebaseAuthService {

  firebaseUser$: Observable<FirebaseUser | null | undefined>;

  constructor(
    @Inject(AuthInjectionToken) private readonly auth: Auth
  ) {
    this.firebaseUser$ = new Observable<FirebaseUser | null>((subscriber) => {
      const unsubscribe = onIdTokenChanged(this.auth,
        subscriber.next.bind(subscriber),
        subscriber.error.bind(subscriber),
        subscriber.complete.bind(subscriber)
      );
      return {unsubscribe};
    }).pipe(
      shareReplay()
    );
  }

  signInWithRedirect(provider: AuthProvider, resolver?: PopupRedirectResolver): Observable<void> {
    return defer(() => signInWithRedirect(this.auth, provider, resolver));
  }

  signInWithCustomToken(customToken: string): Observable<UserCredential> {
    return defer(() => signInWithCustomToken(this.auth, customToken));
  }

  signInAnonymously(): Observable<UserCredential> {
    return defer(() => signInAnonymously(this.auth));
  }

  signInWithEmailAndPassword(email: string, password: string): Observable<UserCredential | void> {
    return defer(() => signInWithEmailAndPassword(this.auth, email, password));
  }

  createUserWithEmailAndPassword(email: string, password: string): Observable<UserCredential> {
    return defer(() => createUserWithEmailAndPassword(this.auth, email, password));
  }

  sendEmailVerification(firebaseUser: FirebaseUser): Observable<void> {
    return defer(() => sendEmailVerification(firebaseUser));
  }

  sendPasswordResetEmail(email: string): Observable<void> {
    return defer(() => sendPasswordResetEmail(this.auth, email));
  }

  signOut(): Observable<void> {
    return defer(() => signOut(this.auth));
  }

  updatePassword(firebaseUser: FirebaseUser, newPassword: string): Observable<{code: string; message: string}> {

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

  deleteUser(): Observable<void> {
    return defer(async () => {
      return this.auth.currentUser?.delete();
    }).pipe(catchError((e) => {
      // TODO to check on production
      console.log(e);
      throw e;
    }));
  }
}
