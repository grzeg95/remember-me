import {Inject, Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {getString, RemoteConfig} from 'firebase/remote-config';
import {BehaviorSubject, interval, Subscription} from 'rxjs';
import {decrypt, userConverter} from '../security';
import {FirebaseUser, User} from './user-data.model';
import {MatSnackBar} from '@angular/material/snack-bar';
import {RouterDict} from '../app.constants';
import {Buffer} from 'buffer';
import {httpsCallable, Functions, httpsCallableFromURL} from 'firebase/functions';
import {
  signOut,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithRedirect,
  Auth,
  signInWithCustomToken,
  IdTokenResult
} from 'firebase/auth';
import {Firestore, onSnapshot, doc, DocumentSnapshot, DocumentData} from 'firebase/firestore';

@Injectable()
export class AuthService {

  user$: BehaviorSubject<User> = new BehaviorSubject<User>(undefined);
  firebaseUser: FirebaseUser;

  isUserDecrypted$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(undefined);
  userDocUnsub: () => void;
  whileLoginIn$ = new BehaviorSubject<boolean>(false);
  userIntervalReloadSub: Subscription;
  isWaitingForCryptoKey$ = new BehaviorSubject<boolean>(false);

  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    @Inject('FUNCTIONS') private readonly functions: Functions,
    @Inject('AUTH') private readonly auth: Auth,
    @Inject('FIRESTORE') private readonly firestore: Firestore,
    @Inject('REMOTE-CONFIG') private readonly remoteConfig: RemoteConfig
  ) {

    this.auth.onAuthStateChanged(async (firebaseUser) => {

      this.unsubscribeUserIntervalReloadSub();
      this.unsubscribeUserDocSub();

      if (firebaseUser) {

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
      } else {
        this.isWaitingForCryptoKey$.next(false);
        this.user$.next(null);
        this.firebaseUser = null;
        this.isUserDecrypted$.next(false);
        this.whileLoginIn$.next(false);
        this.router.navigate(['/']);
      }
    });
  }

  proceedGettingOfCryptoKey(firebaseUser: FirebaseUser, actionUserDocSnap?): void {
    this.getSecretKey(firebaseUser).then(async ({cryptoKey, firebaseUser, idTokenResult}) => {
      return this.userPostAction(cryptoKey, firebaseUser, idTokenResult, actionUserDocSnap);
    }).catch(() => {
      this.signOut();
    });
  }

  getSecretKey(currentFirebaseUser: FirebaseUser): Promise<{firebaseUser: FirebaseUser, cryptoKey: CryptoKey, idTokenResult: IdTokenResult}> {

    return currentFirebaseUser.getIdTokenResult(true).then((idTokenResult) => {

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

  async userPostAction(cryptoKey: CryptoKey, firebaseUser: FirebaseUser, idTokenResult: IdTokenResult, actionUserDocSnap?: DocumentSnapshot<DocumentData>): Promise<void> {

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
      this.whileLoginIn$.next(false);
      this.isUserDecrypted$.next(true);
    });
  }

  googleSignIn(): void {
    this.whileLoginIn$.next(true);

    signInWithRedirect(this.auth, new GoogleAuthProvider()).catch(() => {
      this.snackBar.open('Some went wrong 🤫 Try again 🙂');
    }).finally(() => {
      this.whileLoginIn$.next(false);
    });
  }

  anonymouslySignIn(): void {
    this.whileLoginIn$.next(true);

    signInAnonymously(this.auth).catch(() => {
      this.snackBar.open('Some went wrong 🤫 Try again 🙂');
      this.whileLoginIn$.next(false);
    }).then(() => {
      this.router.navigate(['/', RouterDict.user, RouterDict.rounds, RouterDict.roundsList]);
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

  deleteUser() {
    return this.firebaseUser.delete();
  }
}
