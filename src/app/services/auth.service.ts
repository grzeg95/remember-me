import {Inject, Injectable} from '@angular/core';
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
  signInWithPopup,
  signOut,
  updatePassword,
  User as FirebaseUser,
  UserCredential
} from 'firebase/auth';
import {Firestore} from 'firebase/firestore';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  defer,
  firstValueFrom,
  from,
  iif,
  map,
  Observable,
  of,
  Subscription,
  switchMap
} from 'rxjs';
import {RouterDict} from '../app.constants';
import {AuthInjectionToken, FirestoreInjectionToken} from '../models/firebase';
import {User} from '../models/user';
import {getCryptoKey} from '../utils/crypto';
import {docSnapshots} from './firebase/firestore';
import {FunctionsService} from './functions.service';

@Injectable()
export class AuthService {

  readonly authStateReady$ = from(this._auth.authStateReady()).pipe(
    map(() => true)
  );

  readonly user$ = new BehaviorSubject<User | undefined | null>(undefined);
  private _userSub: Subscription | undefined;

  readonly firebaseUser$ = new Observable<FirebaseUser | null>((subscriber) => {
    const unsubscribe = onAuthStateChanged(this._auth, {
      next: subscriber.next.bind(subscriber),
      error: subscriber.error.bind(subscriber),
      complete: subscriber.complete.bind(subscriber)
    });
    return {unsubscribe};
  });

  readonly loadingUser$ = new BehaviorSubject<boolean>(false);

  readonly hasEncryptedSecretKey$ = new BehaviorSubject<boolean>(false);

  readonly cryptoKey$ = new BehaviorSubject<CryptoKey | undefined>(undefined);

  readonly whileLoginIn$ = new BehaviorSubject<boolean>(false);

  private _wasUserCreatedWithEmailAndPassword = false;

  constructor(
    private readonly _router: Router,
    @Inject(AuthInjectionToken) private readonly _auth: Auth,
    @Inject(FirestoreInjectionToken) private readonly _firestore: Firestore,
    private readonly functionsService: FunctionsService
  ) {

    // user
    let user_userId: string | undefined;
    let user_cryptoKey: CryptoKey | undefined;
    combineLatest([
      this.firebaseUser$,
      this.cryptoKey$,
      this.authStateReady$
    ]).subscribe(([firebaseUser, cryptoKey, authStateReady]) => {

      console.log(firebaseUser, cryptoKey, authStateReady);

      if (authStateReady === undefined || firebaseUser === undefined) {
        return;
      }

      if (!firebaseUser) {
        this.user$.next(null);
        this.loadingUser$.next(false);
        user_userId = undefined;
        user_cryptoKey = undefined;
        this._userSub && !this._userSub.closed && this._userSub.unsubscribe();
        return;
      }

      if (
        user_userId === firebaseUser.uid &&
        user_cryptoKey === cryptoKey
      ) {
        return;
      }

      user_userId = firebaseUser.uid;
      user_cryptoKey = cryptoKey;

      const userRef = User.ref(this._firestore, firebaseUser.uid);

      this.loadingUser$.next(true);
      this._userSub && !this._userSub.closed && this._userSub.unsubscribe();
      this._userSub = docSnapshots(userRef).pipe(
        catchError((error) => {
          console.error(error);
          if (error.code === 'permission-denied') {
            this.signOut().subscribe();
          }
          throw error;
        })
      ).subscribe(async (userDocSnap) => {

        if (!cryptoKey) {
          return;
        }

        const user = await User.data(userDocSnap, cryptoKey);

        if (user.photoURL) {
          user.hasCustomPhoto = true;
        } else {
          user.photoURL = firebaseUser.photoURL || '';
          user.hasCustomPhoto = false;
        }

        if (user.hasInitialData) {
          this.user$.next(user);
          this.loadingUser$.next(false);
          this.whileLoginIn$.next(false);
        }

        // this._router.routerState.snapshot.url is empty for user round views
        // so there is no reason for creating separate function for checking
        // if client is on user rounds view

        if (this._router.routerState.snapshot.url === '/') {
          setTimeout(() => this._router.navigate(['/', RouterDict.user]));
        }
      });
    });

    // cryptoKey
    let cryptoKey_firebaseUserId: string | undefined;
    let cryptoKey_userHasEncryptedSecretKey: boolean | undefined;
    combineLatest([
      this.firebaseUser$,
      this.hasEncryptedSecretKey$
    ]).subscribe(async ([firebaseUser, hasEncryptedSecretKey]) => {

      const defend = () => {
        this.cryptoKey$.next(undefined);
        cryptoKey_firebaseUserId = undefined;
        cryptoKey_userHasEncryptedSecretKey = undefined;
        this.signOut().subscribe();
        setTimeout(() => this._router.navigate(['/']));
      };

      if (this._wasUserCreatedWithEmailAndPassword) {
        this._wasUserCreatedWithEmailAndPassword = false;
        defend();
        return;
      }

      if (firebaseUser === undefined) {
        return;
      }

      if (!firebaseUser) {
        return defend();
      }

      if (
        cryptoKey_firebaseUserId === firebaseUser.uid &&
        cryptoKey_userHasEncryptedSecretKey === hasEncryptedSecretKey
      ) {
        return;
      }

      cryptoKey_firebaseUserId = firebaseUser.uid;
      cryptoKey_userHasEncryptedSecretKey = hasEncryptedSecretKey;

      // encryptedSymmetricKey and secretKey
      let idTokenResult = await getIdTokenResult(firebaseUser, false);

      if (!idTokenResult!.claims['secretKey']) {
        idTokenResult = await getIdTokenResult(firebaseUser, true);
      }

      if (!idTokenResult!.claims['secretKey']) {
        const customTokenWithSecretKeyResult = await firstValueFrom(this.functionsService.httpsCallable<null, {
          customToken: string
        }>('auth-gettokenwithsecretkey', null));

        const userCredential = await signInWithCustomToken(this._auth, customTokenWithSecretKeyResult.customToken);

        // secretKey
        idTokenResult = await getIdTokenResult(userCredential.user, true);

        this.cryptoKey$.next(await getCryptoKey(idTokenResult!.claims['secretKey'] as string));
      } else {
        this.cryptoKey$.next(await getCryptoKey(idTokenResult!.claims['secretKey'] as string));
      }
    });
  }

  googleSignIn() {

    return defer(() => {
      this.whileLoginIn$.next(true);
      return signInWithPopup(this._auth, new GoogleAuthProvider()).catch((e) => {
        this.whileLoginIn$.next(false);
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

    return this.firebaseUser$.pipe(
      switchMap((firebaseUser) =>
        iif(
          () => !!firebaseUser,
          updatePassword(firebaseUser!, newPassword).then(() => {
            return {
              code: 'auth/password-updated',
              message: 'Password has been updated 🤫'
            }
          }),
          defer(() => {
            // was created by email password
            if (!firebaseUser || firebaseUser.providerData[0]?.providerId !== 'password') {
              throw {
                code: 'auth/unauthorized',
                message: `Password hasn't been updated 🤫`
              }
            }

            return of({code: '', message: ''})
          })
        )
      )
    );
  }

  signOut(): Observable<void> {
    return defer(() => signOut(this._auth));
  }

  deleteUser(): Observable<void> {

    return this.firebaseUser$.pipe(
      switchMap((firebaseUser) =>
        iif(
          () => !!firebaseUser,
          deleteUser(firebaseUser!),
          Promise.resolve()
        )
      )
    );
  }
}
