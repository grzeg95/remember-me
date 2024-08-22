import {effect, Inject, Injectable} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
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
import {Firestore} from 'firebase/firestore';
import {catchError, defer, firstValueFrom, from, map, Observable, Subscription, switchMap} from 'rxjs';
import {RouterDict} from '../app.constants';
import {AuthInjectionToken, FirestoreInjectionToken} from '../models/firebase';
import {User} from '../models/user';
import {getCryptoKey} from '../utils/crypto';
import {Sig} from '../utils/Sig';
import {docSnapshots} from './firebase/firestore';
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

  readonly loadingUserSig = new Sig<boolean>(false);

  readonly userSig = new Sig<User | null>();
  private _userSub: Subscription | undefined;

  readonly hasEncryptedSecretKeySig = new Sig<boolean>(false);
  private readonly _hasEncryptedSecretKey = this.hasEncryptedSecretKeySig.get();

  readonly cryptoKeySig = new Sig<CryptoKey>();
  private readonly _cryptoKey = this.cryptoKeySig.get();

  readonly whileLoginInSig = new Sig<boolean>(false);

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
    effect(async () => {

      const firebaseUser = this.firebaseUser();
      const cryptoKey = this._cryptoKey();
      const authStateReady = this.authStateReady();

      if (authStateReady === undefined || firebaseUser === undefined) {
        return;
      }

      if (!firebaseUser) {
        this.userSig.set(null);
        this.hasEncryptedSecretKeySig.set(undefined);
        this.loadingUserSig.set(false);
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

      this.loadingUserSig.set(true);
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
          this.hasEncryptedSecretKeySig.set(userDocSnap.data()?.hasEncryptedSecretKey);
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
          this.userSig.set(user);
          this.loadingUserSig.set(false);
          this.whileLoginInSig.set(false);
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
    effect(async () => {

      const defend = () => {
        this.cryptoKeySig.set(undefined);
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

      const firebaseUser = this.firebaseUser();
      const hasEncryptedSecretKey = this._hasEncryptedSecretKey();

      if (firebaseUser === undefined || !hasEncryptedSecretKey) {
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
      let idTokenResult = await getIdTokenResult(firebaseUser, true);

      if (!idTokenResult!.claims['secretKey']) {
        const customTokenWithSecretKeyResult = await firstValueFrom(this.functionsService.httpsCallable<null, {
          customToken: string
        }>('auth-gettokenwithsecretkey', null));

        const userCredential = await signInWithCustomToken(this._auth, customTokenWithSecretKeyResult.customToken);

        // secretKey
        idTokenResult = await getIdTokenResult(userCredential.user, true);

        this.cryptoKeySig.set(await getCryptoKey(idTokenResult!.claims['secretKey'] as string));
      } else {
        this.cryptoKeySig.set(await getCryptoKey(idTokenResult!.claims['secretKey'] as string));
      }
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

      const firebaseUser = this.firebaseUser();

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

      const firebaseUser = this.firebaseUser();

      if (!firebaseUser) {
        return Promise.resolve();
      }

      return deleteUser(firebaseUser);
    });
  }
}
