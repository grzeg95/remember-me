import {computed, DestroyRef, effect, Inject, Injectable} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Router} from '@angular/router';
import {
  Auth,
  createUserWithEmailAndPassword,
  getIdTokenResult,
  GoogleAuthProvider,
  IdTokenResult,
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
import {Firestore} from 'firebase/firestore';
import {
  catchError,
  defer,
  from,
  map,
  mergeMap,
  NEVER,
  Observable,
  of,
  Subscription,
  switchMap,
  takeWhile,
  throwError,
  zip
} from 'rxjs';
import {RouterDict} from '../app.constants';
import {AuthInjectionToken, FirestoreInjectionToken} from '../models/firebase';
import {User} from '../models/user';
import {getCryptoKey} from '../utils/crypto';
import {docSnapshots} from '../utils/firestore';
import {Sig} from '../utils/sig';
import {FunctionsService} from './functions.service';

@Injectable()
export class AuthService {

  readonly authStateReady = toSignal(from(this._auth.authStateReady()).pipe(
    map(() => true)
  ));

  readonly firebaseUser = toSignal(new Observable<FirebaseUser | null>((subscriber) => {
    const unsubscribe = onAuthStateChanged(this._auth, {
      next: subscriber.next.bind(subscriber),
      error: subscriber.error.bind(subscriber),
      complete: subscriber.complete.bind(subscriber)
    });
    return {unsubscribe};
  }));

  readonly isLoggedIn = computed(() => {
    return !!this.firebaseUser();
  });

  readonly loadingUserSig = new Sig<boolean>(true);
  readonly userSig = new Sig<User | null>();
  private _userSub: Subscription | undefined;

  private _tokenSub: Subscription | undefined;

  private readonly _wasUserCreatedWithEmailAndPasswordSig = new Sig<boolean>(false);
  private readonly _wasUserCreatedWithEmailAndPassword = this._wasUserCreatedWithEmailAndPasswordSig.get();

  constructor(
    private readonly _router: Router,
    private readonly _snackBar: MatSnackBar,
    @Inject(AuthInjectionToken) private readonly _auth: Auth,
    @Inject(FirestoreInjectionToken) private readonly _firestore: Firestore,
    private readonly _functionsService: FunctionsService,
    private readonly _destroyRef: DestroyRef
  ) {

    let firebaseUserUid: string | undefined;
    effect(async () => {

      if (this._wasUserCreatedWithEmailAndPassword()) {
        this._wasUserCreatedWithEmailAndPasswordSig.set(false);
        this.signOut().subscribe();
        return;
      }

      const authStateReady = this.authStateReady();

      if (!authStateReady) {
        return;
      }

      const firebaseUser = this.firebaseUser();

      if (!firebaseUser) {
        this.userSig.set(null);
        this.loadingUserSig.set(false);
        this._userSub && !this._userSub.closed && this._userSub.unsubscribe();
        firebaseUserUid = undefined;
        this._tokenSub && !this._tokenSub.closed && this._tokenSub.unsubscribe();
        return;
      }

      if (
        firebaseUserUid === firebaseUser.uid &&
        this._userSub && !this._userSub.closed
      ) {
        return;
      }
      firebaseUserUid = firebaseUser.uid;

      this.loadingUserSig.set(true);

      const isAnonymous = firebaseUser.isAnonymous || !firebaseUser.providerData.length;

      if (!isAnonymous && !firebaseUser.emailVerified) {
        this._snackBar.open('Please verify your email 🤫 and try again 🙂');
        this.signOut().subscribe();
        firebaseUserUid = undefined;
        return;
      }

      let idTokenResult: IdTokenResult | undefined;

      for (let i = 0; i < 10; ++i) {

        try {
          idTokenResult = await getIdTokenResult(firebaseUser, true).then((idTokenResult) => {
            if (!idTokenResult.claims['encryptedSymmetricKey']) {
              throw new Error('without/encrypted-symmetric-key');
            }
            return idTokenResult;
          })
        } catch {
          if (i === 9) {
            this.signOut().subscribe();
            return;
          }
        }
      }

      this._tokenSub && !this._tokenSub.closed && this._tokenSub.unsubscribe();
      this._tokenSub = zip(of(idTokenResult!), of(firebaseUser)).pipe(
        switchMap(([idTokenResult, firebaseUser]) => {
          if (!idTokenResult.claims['secretKey']) {
            return this._functionsService.httpsCallable<null, {
              customToken: string
            }>('authGetTokenWithSecretKeyUrl', null).pipe(
              switchMap((res) => signInWithCustomToken(this._auth, res.customToken)),
              mergeMap((userCredential) => {
                return zip(
                  getIdTokenResult(userCredential.user, true),
                  of(userCredential.user)
                );
              })
            )
          }
          return zip(of(idTokenResult), of(firebaseUser))
        }),
        catchError(() => {
          this.signOut().subscribe();
          this.loadingUserSig.set(false);
          return NEVER;
        })
      ).subscribe(async ([idTokenResult, firebaseUser]) => {

        const cryptoKey = await getCryptoKey(idTokenResult.claims['secretKey'] as string);

        const userRef = User.ref(this._firestore, firebaseUser.uid);

        this._userSub && !this._userSub.closed && this._userSub.unsubscribe();

        this._userSub = docSnapshots(userRef).pipe(
          takeUntilDestroyed(this._destroyRef),
          takeWhile(() => !!this.firebaseUser()),
          switchMap((snap) => User.data(snap, cryptoKey)),

        ).subscribe((user) => {

          if (!user) {
            return;
          }

          if (idTokenResult.claims['isAnonymous']) {
            user.isAnonymous = true;
            user.providerId = 'Anonymous';
          } else {
            user.isAnonymous = firebaseUser.isAnonymous;
            user.providerId = firebaseUser.providerData[0].providerId;
          }

          this.userSig.set(user);

          if (this._router.routerState.snapshot.url === '/') {
            this._router.navigate(['/', RouterDict.user]).then(() => {
              this.loadingUserSig.set(false);
            });
          } else {
            this.loadingUserSig.set(false);
          }
        });
      });

    });
  }

  googleSignIn(): Observable<void> {

    return defer(() => {

      this.loadingUserSig.set(true);

      return from(signInWithRedirect(this._auth, new GoogleAuthProvider())).pipe(
        catchError((e) => {
          this.loadingUserSig.set(false);
          throw e;
        })
      );
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

      this._wasUserCreatedWithEmailAndPasswordSig.set(true);

      return from(createUserWithEmailAndPassword(this._auth, email, password)).pipe(
        catchError((error: {code: string, message: string}) => {
          if (error.code === 'auth/weak-password') {
            error.message = 'Password should has at least 6 characters 😩';
          }

          if (error.code === 'auth/email-already-in-use') {
            error.message = 'Email already in use 😕 Try other 🧐';
          }

          throw error;
        }),
        mergeMap((userCredential) => {
          return from(sendEmailVerification(userCredential.user)).pipe(
            catchError(() => {
              throw {
                code: 'user-created',
                message: 'User has been created 🤗 Please try to login 🙈'
              }
            }),
            map(() => {
              return {
                code: 'user-created',
                message: 'User has been created 🤗 To login verify your email address by link in that has been sent to you 🧐'
              };
            })
          )
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

      const user = this.userSig.get()();
      const firebaseUser = this.firebaseUser();

      // was created by email password
      if (!user || firebaseUser?.providerData[0]?.providerId !== 'password') {

        return throwError(() => {
          return {
            code: 'auth/unauthorized',
            message: `Password hasn't been updated 🤫`
          }
        });
      }

      return from(updatePassword(firebaseUser, newPassword)).pipe(
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
    });
  }

  signOut(): Observable<void> {
    return from(signOut(this._auth));
  }

  deleteUser(): Observable<void> {
    return defer(async () => {
      return this._auth.currentUser?.delete();
    }).pipe(catchError((e) => {
      // TODO to check on production
      console.log(e);
      throw e;
    }));
  }
}
