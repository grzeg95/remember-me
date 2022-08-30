import {HttpClient} from '@angular/common/http';
import {Inject, Injectable} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Router} from '@angular/router';
import {Analytics, logEvent} from "@firebase/analytics";
import {getToken} from '@firebase/app-check';
import {Buffer} from 'buffer';
import {AppCheck} from 'firebase/app-check';
import {
  Auth,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  IdTokenResult,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signOut,
  updatePassword,
  UserCredential
} from 'firebase/auth';
import {deleteField, doc, DocumentData, DocumentSnapshot, Firestore, onSnapshot, updateDoc} from 'firebase/firestore';
import {Functions, httpsCallable, httpsCallableFromURL} from 'firebase/functions';
import {getString, RemoteConfig} from 'firebase/remote-config';
import {BehaviorSubject, lastValueFrom} from 'rxjs';
import {environment} from "../../environments/environment";
import {RouterDict} from '../app.constants';
import {ANALYTICS, APP_CHECK, AUTH, FIRESTORE, FUNCTIONS, REMOTE_CONFIG} from '../injectors';
import {decryptUser, userConverter} from '../security';
import {onAuthStateChanged$} from './index';
import {FirebaseUser, User} from './user-data.model';

@Injectable()
export class AuthService {

  user$: BehaviorSubject<User> = new BehaviorSubject<User>(undefined);
  firebaseUser: FirebaseUser;
  userDocUnsub: () => void;
  whileLoginIn$ = new BehaviorSubject<boolean>(false);
  isWaitingForCryptoKey$ = new BehaviorSubject<boolean>(false);
  onSnapshotUnsubList: (() => void)[] = [];
  creatingUserWithEmailAndPassword = false;
  wasReloaded = false;
  wasTriedToLogInAMomentAgo = false;
  firstTimeOfPageLoading = true;

  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    @Inject(FUNCTIONS) private readonly functions: Functions,
    @Inject(AUTH) private readonly auth: Auth,
    @Inject(FIRESTORE) private readonly firestore: Firestore,
    @Inject(REMOTE_CONFIG) private readonly remoteConfig: RemoteConfig,
    @Inject(APP_CHECK) private readonly appCheck: AppCheck,
    @Inject(ANALYTICS) private readonly analytics: Analytics,
    private http: HttpClient
  ) {

    this.auth.beforeAuthStateChanged((firebaseUser: FirebaseUser) => {
      if (firebaseUser && !this.firstTimeOfPageLoading) {
        return firebaseUser.reload().then(() => {
          this.wasReloaded = true;
        });
      }
      if (this.firstTimeOfPageLoading) {
        this.firstTimeOfPageLoading = false;
      }
    });

    onAuthStateChanged$(this.auth).subscribe((firebaseUser: FirebaseUser) => {

      // TMP
      logEvent(this.analytics, 'onAuthStateChanged', {
        value: [!!firebaseUser,
          this.creatingUserWithEmailAndPassword,
          !crypto.subtle,
          this.wasReloaded,
          this.wasTriedToLogInAMomentAgo,
          firebaseUser?.isAnonymous,
          !firebaseUser?.providerData.length,
          firebaseUser?.emailVerified].map((b) => typeof b === 'undefined' ? '.' : b ? 1 : 0).join('')
      });

      if (firebaseUser) {

        if (this.creatingUserWithEmailAndPassword) {
          this.creatingUserWithEmailAndPassword = false;
          this.signOut();
          return;
        }

        if (!crypto.subtle) {
          this.signOut();
          this.snackBar.open('Stop using IE lol');
          return;
        }

        if (this.wasReloaded && !this.wasTriedToLogInAMomentAgo) {
          this.wasReloaded = false;
          return;
        }

        if (this.wasTriedToLogInAMomentAgo) {
          this.wasTriedToLogInAMomentAgo = false;
        }

        const isAnonymous = firebaseUser.isAnonymous || !firebaseUser.providerData.length;

        // check if email was verified but not anonymous
        if (!isAnonymous && !firebaseUser.emailVerified) {
          this.snackBar.open('Please verify you email 🤫 and try again 🙂');
          this.signOut();
          return;
        }

        if (!this.firebaseUser) {
          this.whileLoginIn$.next(true);
        }
        this.firebaseUser = firebaseUser;
        this.unsubscribeUserDocSub();

        const userDocRef = doc(this.firestore, `users/${this.firebaseUser.uid}`).withConverter(userConverter);
        this.userDocUnsub = onSnapshot(userDocRef, (snap) => {

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

      } else {

        for (const unsub of this.onSnapshotUnsubList) {
          if (unsub) {
            unsub();
          }
        }
        this.onSnapshotUnsubList = [];

        this.unsubscribeUserDocSub();
        this.isWaitingForCryptoKey$.next(false);
        this.user$.next(null);
        this.firebaseUser = null;
        this.whileLoginIn$.next(false);
        this.router.navigate(['/']);
      }
    });
  }

  proceedGettingOfCryptoKey(firebaseUser: FirebaseUser, actionUserDocSnap?): void {
    this.getSecretKey(firebaseUser).then(({cryptoKey, firebaseUser, idTokenResult}) => {
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
      photoURL: firebaseUser.photoURL,
      hasCustomPhoto: false
    };

    if (idTokenResult.claims.isAnonymous) {
      user.isAnonymous = true;
      user.providerId = 'Anonymous';
    } else {
      user.isAnonymous = firebaseUser.isAnonymous;
      user.providerId = firebaseUser.providerData[0].providerId;
    }

    return decryptUser({
      rounds: actionUserDocSnap.data()?.rounds,
      photoUrl: actionUserDocSnap.data()?.photoUrl,
      hasEncryptedSecretKey: actionUserDocSnap.data()?.hasEncryptedSecretKey
    }, cryptoKey).then((decryptedUser) => {

      if (decryptedUser.rounds) {
        user.rounds = decryptedUser.rounds;
      }

      if (decryptedUser.photoUrl) {
        user.photoURL = decryptedUser.photoUrl;
        user.hasCustomPhoto = true;
      }

      this.isWaitingForCryptoKey$.next(false);
      this.firebaseUser = firebaseUser;
      this.user$.next(user);

      if (this.router.routerState.snapshot.url === '/') {
        this.router.navigate(['/', RouterDict.user, RouterDict.rounds, RouterDict.roundsList]).then(() => {
          this.whileLoginIn$.next(false);
        });
      } else {
        this.whileLoginIn$.next(false);
      }
    });
  }

  googleSignIn(): Promise<void> {

    // is not logged in
    if (!this.user$.value) {
      this.whileLoginIn$.next(true);

      return signInWithRedirect(this.auth, new GoogleAuthProvider()).catch((e) => {
        this.whileLoginIn$.next(false);
        throw e;
      });
    }

    return Promise.reject();
  }

  anonymouslySignIn(): Promise<UserCredential | void> {

    // is not logged in
    if (!this.user$.value) {
      this.whileLoginIn$.next(true);
      this.wasTriedToLogInAMomentAgo = true;

      return signInAnonymously(this.auth).catch((e) => {
        this.whileLoginIn$.next(false);
        throw e;
      });
    }

    return Promise.reject();
  }

  signInWithEmailAndPassword(email: string, password: string): Promise<UserCredential | void> {

    // is not logged in
    if (!this.user$.value) {
      this.whileLoginIn$.next(true);
      this.wasTriedToLogInAMomentAgo = true;

      return signInWithEmailAndPassword(this.auth, email, password).catch((e) => {
        this.whileLoginIn$.next(false);
        throw e;
      });
    }

    return Promise.reject();
  }

  createUserWithEmailAndPassword(email: string, password: string): Promise<{code: string, message: string}> {

    // is not logged in
    if (!this.user$.value) {
      this.creatingUserWithEmailAndPassword = true;
      return createUserWithEmailAndPassword(this.auth, email, password).then((userCredential) => {
        return sendEmailVerification(userCredential.user).then(() => {
          return {
            code: 'user-created',
            message: 'User has been created 🤗 To login verify your email address by link in that has been sent to you 🧐'
          };
        }).catch(() => {
          throw {
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

        throw error;
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

  updatePassword(newPassword: string): Promise<{code: string; message: string;}> {

    // is not logged in
    // was created by email password
    if (!this.user$.value && !this.firebaseUser && this.firebaseUser.providerData[0]?.providerId !== 'password') {
      return Promise.reject({
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

      throw error;
    });
  }

  unsubscribeUserDocSub(): void {
    if (this.userDocUnsub) {
      this.userDocUnsub();
      this.userDocUnsub = null;
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

    return Promise.reject();
  }

  uploadProfileImage(file: File): Promise<{message: string}> {

    // is logged in
    if (this.user$.value) {
      return Promise.all([
        this.firebaseUser.getIdToken(),
        getToken(this.appCheck).then((token) => token.token)
      ]).then(([userToken, xFirebaseAppCheckToken]) => {

        let url: string = '';

        if (!environment.production) {
          url = `${environment.emulators.functions.protocol}://${environment.emulators.functions.host}:${environment.emulators.functions.port}/${environment.firebase.projectId}/europe-west4/userv2-uploadprofileimage`;
        }

        if (environment.production) {
          url = 'https://userv2-uploadprofileimage-yhy2fc7udq-ez.a.run.app';
        }

        const uploadProfileImageUrl = getString(this.remoteConfig, 'uploadProfileImageUrl');
        if (uploadProfileImageUrl) {
          url = uploadProfileImageUrl;
        }

        const headers = {
          'Content-Type': file.type,
          'authorization': `Bearer ${userToken}`,
          'X-Firebase-AppCheck': xFirebaseAppCheckToken
        };

        return lastValueFrom(
          this.http.post<{message: string}>(url, file, {headers})
        );
      });
    }

    return Promise.reject();
  }

  removePhoto(): Promise<void> {

    // is logged in
    if (this.user$.value) {
      return updateDoc(doc(this.firestore, `users/${this.firebaseUser.uid}`), {
        photoUrl: deleteField()
      });
    }
  }
}
