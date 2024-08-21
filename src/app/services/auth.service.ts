import {computed, effect, Inject, Injectable} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Router} from '@angular/router';
import {
  Auth,
  createUserWithEmailAndPassword,
  deleteUser,
  getIdTokenResult,
  GoogleAuthProvider,
  onAuthStateChanged,
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
import firebase from 'firebase/compat';
import {Firestore} from 'firebase/firestore';
import {catchError, defer, firstValueFrom, from, map, Observable, Subscription, switchMap, takeWhile} from 'rxjs';
import {RouterDict} from '../app.constants';
import {AuthInjectionToken, FirestoreInjectionToken} from '../models/firebase';
import {User} from '../models/user';
import {getCryptoKey} from '../utils/crypto';
import {Sig} from '../utils/Sig';
import {docSnapshots} from './firebase/firestore';
import {FunctionsService} from './functions.service';
import IdTokenResult = firebase.auth.IdTokenResult;

@Injectable()
export class AuthService {

  readonly authStateReady = toSignal(from(this._auth.authStateReady()).pipe(
    map(() => true)
  ));

  private readonly __firebaseUser = toSignal(new Observable<FirebaseUser | null>((subscriber) => {
    const unsubscribe = onAuthStateChanged(this._auth, {
      next: subscriber.next.bind(subscriber),
      error: subscriber.error.bind(subscriber),
      complete: subscriber.complete.bind(subscriber)
    });
    return {unsubscribe};
  }));

  readonly firebaseUserSig = new Sig<FirebaseUser>();
  private _firebaseUser = this.firebaseUserSig.get();

  readonly isLoggedIn = computed(() => {
    return !!this._firebaseUser();
  });

  readonly loadingUserSig = new Sig<boolean>(false);
  readonly userSig = new Sig<User | null>();
  private _userSub: Subscription | undefined;

  readonly cryptoKeySig = new Sig<CryptoKey>();
  private _cryptoKey = this.cryptoKeySig.get();

  readonly whileLoginInSig = new Sig<boolean>(false);
  readonly whileLoginIn = this.whileLoginInSig.get();

  private _wasUserCreatedWithEmailAndPassword = false;

  constructor(
    private readonly _router: Router,
    private readonly _snackBar: MatSnackBar,
    @Inject(AuthInjectionToken) private readonly _auth: Auth,
    @Inject(FirestoreInjectionToken) private readonly _firestore: Firestore,
    private readonly functionsService: FunctionsService
  ) {

    // firebaseUser
    let firebaseUser_IdToken: string | undefined;
    effect(async () => {

      const defend = () => {
        this.whileLoginInSig.set(false);
        this.userSig.set(null);
        firebaseUser_IdToken = undefined;
        this.signOut().subscribe();
        setTimeout(() => this._router.navigate(['/']));
      };

      const __firebaseUser = this.__firebaseUser();
      const authStateReady = this.authStateReady();

      if (authStateReady === undefined) {
        return;
      }

      if (!__firebaseUser) {
        return defend();
      }

      this.whileLoginInSig.set(true);

      const idToken = await __firebaseUser.getIdToken();

      if (firebaseUser_IdToken === idToken) {
        return;
      }

      firebaseUser_IdToken = idToken;

      if (this._wasUserCreatedWithEmailAndPassword) {
        this._wasUserCreatedWithEmailAndPassword = false;
        this.signOut().subscribe();
        return;
      }

      let idTokenResult: IdTokenResult;

      for (let i = 9; i >= 0; --i) {
        try {
          idTokenResult = await getIdTokenResult(__firebaseUser, true).then((idTokenResult) => {
            if (!idTokenResult.claims['encryptedSymmetricKey']) {
              throw new Error('without/encrypted-symmetric-key');
            }
            return idTokenResult;
          });
          break;
        } catch {
          if (i === 0) {
            defend();
            this._snackBar.open('Some went wrong 🤫 Try again 🙂');
            return;
          }
        }
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 1000);
        });
      }

      if (!idTokenResult!.claims['secretKey']) {
        const customTokenWithSecretKeyResult = await firstValueFrom(this.functionsService.httpsCallable<null, {
          customToken: string
        }>('auth-gettokenwithsecretkey', null));
        const userCredential = await signInWithCustomToken(this._auth, customTokenWithSecretKeyResult.customToken);
        this.firebaseUserSig.set(userCredential.user);

        for (let i = 9; i >= 9; --i) {
          try {
            idTokenResult = await getIdTokenResult(__firebaseUser, true).then((idTokenResult) => {
              if (!idTokenResult.claims['secretKey']) {
                throw new Error('without/secret-key');
              }
              return idTokenResult;
            });
            break;
          } catch {
            if (i === 0) {
              defend();
              this._snackBar.open('Some went wrong 🤫 Try again 🙂');
              return
            }
          }
          await new Promise<void>((resolve) => {
            setTimeout(() => resolve(), 1000);
          });
        }

        this.cryptoKeySig.set(await getCryptoKey(idTokenResult!.claims['secretKey'] as string));
      } else {
        this.cryptoKeySig.set(await getCryptoKey(idTokenResult!.claims['secretKey'] as string));
        this.firebaseUserSig.set(__firebaseUser);
      }

      this.whileLoginInSig.set(false);
    });

    // user
    let user_userId: string | undefined;
    effect(() => {

      const firebaseUser = this._firebaseUser();
      const cryptoKey = this._cryptoKey();
      const authStateReady = this.authStateReady();

      if (authStateReady === undefined || firebaseUser === undefined) {
        return;
      }

      if (!firebaseUser || !cryptoKey) {
        this.userSig.set(null);
        this.whileLoginInSig.set(false);
        user_userId = undefined;
        return;
      }

      if (user_userId === firebaseUser.uid) {
        return;
      }

      user_userId = firebaseUser.uid;

      const userRef = User.ref(this._firestore, firebaseUser.uid);

      this.loadingUserSig.set(true);
      this._userSub && !this._userSub.closed && this._userSub.unsubscribe();
      this._userSub = docSnapshots(userRef).pipe(
        takeWhile(() => !!this._firebaseUser() && !!this._cryptoKey() && !!this.authStateReady()),
        catchError((error) => {
          console.error(error);
          if (error.code === 'permission-denied') {
            this.signOut().subscribe();
          }
          throw error;
        })
      ).pipe(
        switchMap((userDocSnap) => User.data(userDocSnap, cryptoKey))
      ).subscribe((user) => {

        if (user.photoURL) {
          user.hasCustomPhoto = true;
        } else {
          user.photoURL = firebaseUser.photoURL || '';
          user.hasCustomPhoto = false;
        }

        this.userSig.set(user);

        // this._router.routerState.snapshot.url is empty for user round views
        // so there is no reason for creating separate function for checking
        // if client is on user rounds view

        if (this._router.routerState.snapshot.url === '/') {
          this._router.navigate(['/', RouterDict.user]).then(() => {
            this.loadingUserSig.set(false);
          });
        } else {
          this.loadingUserSig.set(false);
        }
      });
    });
  }

  googleSignIn(): Observable<void> {

    return defer(() => {
      this.whileLoginInSig.set(true);
      return signInWithRedirect(this._auth, new GoogleAuthProvider()).catch((e) => {
        this.whileLoginInSig.set(false);
        throw e;
      });
    });
  }

  anonymouslySignIn(): Observable<UserCredential> {
    return defer(() => signInAnonymously(this._auth));
  }

  signInWithEmailAndPassword(email: string, password: string): Observable<UserCredential | void> {
    return defer(() => signInWithEmailAndPassword(this._auth, email, password));
  }

  createUserWithEmailAndPassword(email: string, password: string): Observable<{code: string, message: string}> {

    return defer(() => {
      this._wasUserCreatedWithEmailAndPassword = true;

      return defer(() => createUserWithEmailAndPassword(this._auth, email, password)).pipe(
        catchError((error: {code: string, message: string}) => {
          if (error.code === 'auth/weak-password') {
            error.message = 'Password should has at least 6 characters 😩';
          }

          if (error.code === 'auth/email-already-in-use') {
            error.message = 'Email already in use 😕 Try other 🧐';
          }

          throw error;
        }),
        switchMap((userCredential) => {
          return sendEmailVerification(userCredential.user).catch(() => {
            throw {
              code: 'user-created',
              message: 'User has been created 🤗 Please try to login 🙈'
            }
          }).then(() => {
            return {
              code: 'user-created',
              message: 'User has been created 🤗 To login verify your email address by link in that has been sent to you 🧐'
            };
          })
        }));
    });
  }

  sendEmailVerification(user: FirebaseUser): Observable<void> {
    return defer(() => sendEmailVerification(user));
  }

  sendPasswordResetEmail(email: string): Observable<void> {
    return defer(() => sendPasswordResetEmail(this._auth, email));
  }

  updatePassword(newPassword: string): Observable<{code: string; message: string;}> {

    return defer(() => {

      const firebaseUser = this._firebaseUser();

      // was created by email password
      if (!firebaseUser || firebaseUser.providerData[0]?.providerId !== 'password') {
        throw {
          code: 'auth/unauthorized',
          message: `Password hasn't been updated 🤫`
        }
      }

      return updatePassword(firebaseUser, newPassword).then(() => {
        return {
          code: 'auth/password-updated',
          message: 'Password has been updated 🤫'
        }
      });
    });
  }

  signOut(): Observable<void> {
    return defer(() => signOut(this._auth));
  }

  deleteUser(): Observable<void> {

    return defer(() => {

      const firebaseUser = this._firebaseUser();

      if (!firebaseUser) {
        return Promise.resolve();
      }

      return deleteUser(firebaseUser);
    });
  }
}
