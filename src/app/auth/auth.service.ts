import {Inject, Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {BehaviorSubject, interval, Subscription} from 'rxjs';
import {decrypt, userConverter} from '../security';
import {User} from './user-data.model';
import {MatSnackBar} from '@angular/material/snack-bar';
import {RouterDict} from '../app.constants';
import {Buffer} from 'buffer';
import {httpsCallable, Functions} from 'firebase/functions';
import {
  User as FirebaseUser,
  UserCredential,
  signOut,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithRedirect,
  Auth,
  IdTokenResult,
  signInWithCustomToken
} from 'firebase/auth';
import {Firestore, onSnapshot, doc, DocumentSnapshot, DocumentData} from 'firebase/firestore';

@Injectable()
export class AuthService {

  user$: BehaviorSubject<User> = new BehaviorSubject<User>(undefined);
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
    @Inject('FIRESTORE') private readonly firestore: Firestore
  ) {

    this.auth.onAuthStateChanged(async (firebaseUser) => {

      this.unsubscribeUserIntervalReloadSub();
      this.unsubscribeUserDocSub();

      if (firebaseUser) {

        if (!crypto.subtle) {
          this.signOut();
          this.snackBar.open('Stop using IE lol');
          return;
        }

        const user: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified,
          cryptoKey: null,
          firebaseUser,
          idTokenResult: null
        };

        let currentUser = this.user$.value;

        if (!currentUser) {
          currentUser = user;
        }

        // pre 30 min
        this.userIntervalReloadSub = interval(1800000).subscribe(() => {
          this.proceedGettingOfCryptoKey(currentUser);
        });

        const userDocRef = doc(this.firestore, `users/${currentUser.uid}`).withConverter(userConverter);
        this.userDocUnsub = onSnapshot(userDocRef, async (snap) => {

          currentUser = this.user$.value;

          if (!currentUser) {
            currentUser = user;
          }

          if (snap.data()?.hasEncryptedSecretKey) {

            if (currentUser.idTokenResult?.claims.secretKey) {
              return this.userPostAction(currentUser, snap);
            }

            if (this.isWaitingForCryptoKey$.value) {
              return;
            }

            this.isWaitingForCryptoKey$.next(true);
            this.proceedGettingOfCryptoKey(currentUser, snap);
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
        this.isUserDecrypted$.next(false);
        this.whileLoginIn$.next(false);
        this.router.navigate(['/']);
      }
    });
  }

  proceedGettingOfCryptoKey(user: User, actionUserDocSnap?): void {
    this.getSecretKey(user).then(async (action: {cryptoKey: CryptoKey, idTokenResult: IdTokenResult}) => {

      if (action.idTokenResult.claims.isAnonymous) {
        user.isAnonymous = true;
        user.providerId = 'Anonymous';
      } else {
        user.isAnonymous = user.firebaseUser.isAnonymous;
        user.providerId = user.firebaseUser.providerData[0].providerId;
      }

      user.cryptoKey = action.cryptoKey;
      user.idTokenResult = action.idTokenResult;
      return this.userPostAction(user, actionUserDocSnap);
    });
  }

  getSecretKey(user: User): Promise<{cryptoKey: CryptoKey, idTokenResult: IdTokenResult}> {

    return this.getIdTokenResult(user).then((idTokenResult) => {

      if (!idTokenResult.claims.secretKey) {

        return this.getTokenWithSecretKey()
          .then((idTokenResult) => {
            return this.loginWithSecuredToken(idTokenResult);
          })
          .then((userCredential) => {
            user.firebaseUser = userCredential.user;
            return this.getReloadedFirebaseUser(user);
          })
          .then((firebaseUser: FirebaseUser) => {
            user.firebaseUser = firebaseUser;
            return this.getIdTokenResult(user);
          })
          .then((idTokenResult) => {
            return this.getCryptoKeyFromSecretKey(idTokenResult.claims.secretKey as string)
              .then((cryptoKey) => {
                return {cryptoKey, idTokenResult}
              });
          });
      }

      return this.getCryptoKeyFromSecretKey(idTokenResult.claims.secretKey as string)
        .then((cryptoKey) => {
          return {
            cryptoKey,
            idTokenResult
          }
        });
    });
  }

  loginWithSecuredToken(tokenWithSecretKey: string): Promise<UserCredential> {
    return signInWithCustomToken(this.auth, tokenWithSecretKey);
  }

  getIdTokenResult(user: User): Promise<IdTokenResult> {
    return user.firebaseUser.getIdTokenResult(true);
  }

  getTokenWithSecretKey(): Promise<string> {
    return httpsCallable(this.functions, 'getTokenWithSecretKey')()
      .then((result) => result.data as string);
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

  getReloadedFirebaseUser(user: User): Promise<FirebaseUser> {
    return user.firebaseUser.reload().then(() => this.auth.currentUser);
  }

  async userPostAction(user: User, actionUserDocSnap?: DocumentSnapshot<DocumentData>): Promise<void> {

    this.isWaitingForCryptoKey$.next(false);

    if (actionUserDocSnap?.data()?.rounds) {
      user.rounds = JSON.parse(await decrypt(actionUserDocSnap.data()?.rounds, user.cryptoKey));
    }

    this.user$.next(user);
    this.whileLoginIn$.next(false);
    this.isUserDecrypted$.next(true);
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
}
