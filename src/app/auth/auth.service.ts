import {Inject, Injectable} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Router} from '@angular/router';
import {Buffer} from 'buffer';
import {
  Auth,
  GoogleAuthProvider,
  IdTokenResult,
  UserCredential,
  signInAnonymously,
  signInWithCustomToken,
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updatePassword,
  signOut
} from 'firebase/auth';
import {doc, DocumentData, DocumentSnapshot, Firestore, onSnapshot} from 'firebase/firestore';
import {Functions, httpsCallable, httpsCallableFromURL} from 'firebase/functions';
import {getString, RemoteConfig} from 'firebase/remote-config';
import {BehaviorSubject, interval, Subscription} from 'rxjs';
import {RouterDict} from '../app.constants';
import {AUTH, FIRESTORE, FUNCTIONS, REMOTE_CONFIG} from '../injectors';
import {decrypt, userConverter} from '../security';
import {FirebaseUser, User} from './user-data.model';

@Injectable()
export class AuthService {

  user$: BehaviorSubject<User> = new BehaviorSubject<User>(undefined);
  firebaseUser: FirebaseUser;
  userDocUnsub: () => void;
  whileLoginIn$ = new BehaviorSubject<boolean>(false);
  userIntervalReloadSub: Subscription;
  isWaitingForCryptoKey$ = new BehaviorSubject<boolean>(false);
  onSnapshotUnsubList: (() => void)[] = [];
  createdAMomentAgoUserWithEmailAndPassword = false;

  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    @Inject(FUNCTIONS) private readonly functions: Functions,
    @Inject(AUTH) private readonly auth: Auth,
    @Inject(FIRESTORE) private readonly firestore: Firestore,
    @Inject(REMOTE_CONFIG) private readonly remoteConfig: RemoteConfig
  ) {

    this.auth.onAuthStateChanged(async (firebaseUser) => {

      this.unsubscribeUserIntervalReloadSub();
      this.unsubscribeUserDocSub();

      if (firebaseUser) {

        if (this.createdAMomentAgoUserWithEmailAndPassword) {
          this.createdAMomentAgoUserWithEmailAndPassword = false;
          this.signOut();
          return;
        }

        this.firebaseUser = firebaseUser;

        if (!crypto.subtle) {
          this.signOut();
          this.snackBar.open('Stop using IE lol');
          return;
        }

        // pre 30 min
        this.userIntervalReloadSub = interval(1800000).subscribe(() => {
          this.isWaitingForCryptoKey$.next(true);
          this.proceedGettingOfCryptoKey(this.firebaseUser);
        });

        const userDocRef = doc(this.firestore, `users/${firebaseUser.uid}`).withConverter(userConverter);
        this.userDocUnsub = onSnapshot(userDocRef, async (snap) => {

          if (snap.data()?.hasEncryptedSecretKey) {
            this.isWaitingForCryptoKey$.next(true);
            this.proceedGettingOfCryptoKey(this.firebaseUser, snap);
          }
        }, (error) => {
          if (error.code === 'permission-denied') {
            this.signOut();
          }
          throw error;
        });
        this.onSnapshotUnsubList.push(this.userDocUnsub);
      } else {

        for (const unsub of this.onSnapshotUnsubList) {
          if (unsub) {
            unsub();
          }
        }
        this.onSnapshotUnsubList = [];

        this.isWaitingForCryptoKey$.next(false);
        this.user$.next(null);
        this.firebaseUser = null;
        this.whileLoginIn$.next(false);
        this.router.navigate(['/']);
      }
    });
  }

  proceedGettingOfCryptoKey(firebaseUser: FirebaseUser, actionUserDocSnap?): void {
    this.getSecretKey(firebaseUser).then(async ({cryptoKey, firebaseUser, idTokenResult}) => {
      return this.userPostAction(cryptoKey, firebaseUser, idTokenResult, actionUserDocSnap);
    }).catch((error) => {
      if (error && error.code === 'email-not-verified') {
        this.snackBar.open('Please verify you email 🤫 and try again 🙂');
      }
      this.signOut();
    });
  }

  getSecretKey(currentFirebaseUser: FirebaseUser): Promise<{firebaseUser: FirebaseUser, cryptoKey: CryptoKey, idTokenResult: IdTokenResult}> {

    return currentFirebaseUser.getIdTokenResult(true).then((idTokenResult) => {

      if (
        !currentFirebaseUser.emailVerified &&
        !idTokenResult.claims.isAnonymous &&
        idTokenResult.claims.firebase.sign_in_provider !== 'anonymous'
      ) {
        throw {
          code: 'email-not-verified'
        };
      }

      if (!idTokenResult.claims.secretKey) {

        let firebaseUser: FirebaseUser;

        return this.getTokenWithSecretKey()
          .then((idTokenResult) => {
            return signInWithCustomToken(this.auth, idTokenResult);
          })
          .then((userCredential) => {
            firebaseUser = userCredential.user;
            return firebaseUser.getIdTokenResult(true);
          })
          .then((newIdTokenResult) => {
            return this.getCryptoKeyFromSecretKey(newIdTokenResult.claims.secretKey as string)
              .then((cryptoKey) => {
                return {
                  idTokenResult: newIdTokenResult,
                  cryptoKey,
                  firebaseUser
                }
              });
          });
      }

      return this.getCryptoKeyFromSecretKey(idTokenResult.claims.secretKey as string)
        .then((cryptoKey) => {
          return {
            idTokenResult,
            cryptoKey,
            firebaseUser: currentFirebaseUser
          }
        });
    });
  }

  getTokenWithSecretKey(): Promise<string> {

    const getTokenWithSecretKeyUrl = getString(this.remoteConfig, 'getTokenWithSecretKeyUrl');
    let httpsCallableFunction = httpsCallable(this.functions, 'auth-getTokenWithSecretKey');

    if (getTokenWithSecretKeyUrl) {
      httpsCallableFunction = httpsCallableFromURL(this.functions, getTokenWithSecretKeyUrl);
    }

    return httpsCallableFunction().then((result) => result.data as string);
  }

  getCryptoKeyFromSecretKey(secretKey: string): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      'raw',
      Buffer.from(secretKey, 'hex'),
      {
        name: 'AES-GCM'
      },
      false,
      ['decrypt']
    );
  }

  userPostAction(cryptoKey: CryptoKey, firebaseUser: FirebaseUser, idTokenResult: IdTokenResult, actionUserDocSnap?: DocumentSnapshot<DocumentData>): Promise<void> {

    const user: User = {
      cryptoKey,
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      emailVerified: firebaseUser.emailVerified,
      photoURL: firebaseUser.photoURL
    };

    if (idTokenResult.claims.isAnonymous) {
      user.isAnonymous = true;
      user.providerId = 'Anonymous';
    } else {
      user.isAnonymous = firebaseUser.isAnonymous;
      user.providerId = firebaseUser.providerData[0].providerId;
    }

    return new Promise<string>((resolve) => {
      if (actionUserDocSnap?.data()?.rounds) {
        return resolve(decrypt(actionUserDocSnap.data()?.rounds, user.cryptoKey));
      }
      return resolve(null);
    }).then((rounds) => {

      if (rounds) {
        user.rounds = JSON.parse(rounds);
      }

      this.isWaitingForCryptoKey$.next(false);
      this.firebaseUser = firebaseUser;
      this.user$.next(user);

      if (this.router.routerState.snapshot.url === '/') {
        this.router.navigate(['/', RouterDict.user, RouterDict.rounds, RouterDict.roundsList]).then(() => {
          this.whileLoginIn$.next(false);
        });
      }
    });
  }

  googleSignIn(): void {

    // is not logged in
    if (!this.user$.value) {
      this.whileLoginIn$.next(true);

      signInWithRedirect(this.auth, new GoogleAuthProvider()).catch(() => {
        this.snackBar.open('Some went wrong 🤫 Try again 🙂');
      }).finally(() => {
        this.whileLoginIn$.next(false);
      });
    }
  }

  anonymouslySignIn(): void {

    // is not logged in
    if (!this.user$.value) {
      this.whileLoginIn$.next(true);

      signInAnonymously(this.auth).catch(() => {
        this.snackBar.open('Some went wrong 🤫 Try again 🙂');
        this.whileLoginIn$.next(false);
      });
    }
  }

  signInWithEmailAndPassword(email: string, password: string): Promise<UserCredential | void> {

    // is not logged in
    if (!this.user$.value) {
      return signInWithEmailAndPassword(this.auth, email, password);
    }

    return Promise.reject();
  }

  createUserWithEmailAndPassword(email: string, password: string): Promise<{code: string, message: string}> {

    // is not logged in
    if (!this.user$.value) {
      return createUserWithEmailAndPassword(this.auth, email, password).then((userCredential) => {
        this.createdAMomentAgoUserWithEmailAndPassword = true;
        return sendEmailVerification(userCredential.user).then(() => {
          return {
            code: 'user-created',
            message: 'User has been created 🤗 To login verify your email address by link in that has been sent to you 🧐'
          };
        }).catch(() => {
          return {
            code: 'user-created',
            message: 'User has been created 🤗 Please try to login 🙈'
          }
        });
      }).catch((error: {code: string, message: string}) => {

        if (error.code === 'auth/weak-password') {
          error.message = 'Password should has at least 6 characters 😩';
        }

        if (error.code === 'auth/email-already-in-use') {
          error.message = 'Email already in use 😕 Try other 🧐';
        }

        return error;
      });
    }

    return Promise.reject();
  }

  sendEmailVerification(user: FirebaseUser): Promise<void> {

    // is not logged in
    if (!this.user$.value) {
      return sendEmailVerification(user);
    }

    return Promise.reject();
  }

  sendPasswordResetEmail(email: string): Promise<void> {

    // is not logged in
    if (!this.user$.value) {
      return sendPasswordResetEmail(this.auth, email);
    }

    return Promise.reject();
  }

  updatePassword(newPassword: string): Promise<{ code: string; message: string; }> {

    // is not logged in
    // was created by email password
    if (!this.user$.value && !this.firebaseUser && this.firebaseUser.providerData[0]?.providerId !== 'password') {
      return Promise.resolve({
        code: 'auth/unauthorized',
        message: `Password hasn't been updated 🤫`
      });
    }

    return updatePassword(this.firebaseUser, newPassword).then(() => {
      return {
        code: 'auth/password-updated',
        message: 'Password has been updated 🤫'
      }
    }).catch((error: {code: string, message: string}) => {

      if (error.code === 'auth/weak-password') {
        error.message = 'Password should has at least 6 characters 😩';
      }

      return error;
    });
  }

  unsubscribeUserDocSub(): void {
    if (this.userDocUnsub) {
      this.userDocUnsub();
      this.userDocUnsub = null;
    }
  }

  unsubscribeUserIntervalReloadSub(): void {
    if (this.userIntervalReloadSub && !this.userIntervalReloadSub.closed) {
      this.userIntervalReloadSub.unsubscribe();
    }
  }

  signOut(): Promise<void> {
    return signOut(this.auth);
  }

  deleteUser(): Promise<void> {

    // is logged in
    if (this.user$.value) {
      return this.firebaseUser.delete();
    }
  }
}
