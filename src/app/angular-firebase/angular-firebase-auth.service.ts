import {Inject, Injectable, NgZone, OnDestroy} from '@angular/core';
import {
  Auth,
  AuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  getIdToken,
  getIdTokenResult,
  IdTokenResult,
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
  updatePassword,
  User as FirebaseUser,
  UserCredential
} from 'firebase/auth';
import {BehaviorSubject, catchError, defer, filter, map, Observable, Subscription} from 'rxjs';
import {AUTH} from './angular-firebase-injectors';
import {runInZone} from './tools';

@Injectable()
export class AngularFirebaseAuthService implements OnDestroy {

  private _user$ = new BehaviorSubject<FirebaseUser>(undefined);
  private _onIdTokenChangedSub: Subscription;

  constructor(
    @Inject(AUTH) private readonly auth: Auth,
    private ngZone: NgZone
  ) {
  }

  ngOnDestroy(): void {
    if (this._onIdTokenChangedSub && !this._onIdTokenChangedSub.closed) {
      this._onIdTokenChangedSub.unsubscribe();
    }
  }

  user(): Observable<FirebaseUser> {

    if (!this._onIdTokenChangedSub) {
      this._onIdTokenChangedSub = new Observable<FirebaseUser>((subscriber) => {
        const unsubscribe = this.ngZone.run(() => onIdTokenChanged(this.auth,
          subscriber.next.bind(subscriber),
          subscriber.error.bind(subscriber),
          subscriber.complete.bind(subscriber)
        ));
        return {unsubscribe};
      }).pipe(
        runInZone(this.ngZone)
      ).subscribe((firebaseUser) => this._user$.next(firebaseUser));
    }

    return this._user$.asObservable().pipe(
      filter((firebaseUser) => firebaseUser !== undefined)
    );
  }

  reload(user: FirebaseUser, callback?: () => void): Observable<void> {
    return defer(() => reload(user).then(() => {
      if (callback) {
        callback();
      }
    }));
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

  getIdTokenResult(firebaseUser: FirebaseUser, forceRefresh?: boolean): Observable<IdTokenResult> {
    return defer(() => getIdTokenResult(firebaseUser, forceRefresh));
  }

  deleteUser(firebaseUser: FirebaseUser): Observable<void> {
    return defer(() => deleteUser(firebaseUser));
  }

  getAuthorizationToken(firebaseUser: FirebaseUser, forceRefresh: boolean = false): Observable<string> {
    return defer(() => getIdToken(firebaseUser, forceRefresh)).pipe(map((token) => `Bearer ${token}`));
  }
}
