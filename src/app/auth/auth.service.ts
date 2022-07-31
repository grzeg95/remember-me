import {Injectable} from '@angular/core';
import {AngularFireAuth} from '@angular/fire/compat/auth';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {AngularFireFunctions} from '@angular/fire/compat/functions';
import {Router} from '@angular/router';
import firebase from 'firebase/compat';
import {asyncScheduler, BehaviorSubject, interval, mergeMap, Observable, of, Subscription} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {decrypt} from '../security';
import {HTTPError} from '../user/models';
import {User, EncryptedUser} from './user-data.model';
import {GoogleAuthProvider} from 'firebase/auth';
import {MatSnackBar} from '@angular/material/snack-bar';
import {RouterDict} from '../app.constants';
import {Buffer} from 'buffer';
import UserCredential = firebase.auth.UserCredential;

@Injectable()
export class AuthService {

  user$: BehaviorSubject<User> = new BehaviorSubject<User>(undefined);
  isUserDecrypted$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(undefined);
  userDocSub: Subscription;
  whileLoginIn = false;
  userIntervalReloadSub: Subscription;
  isWaitingForCryptoKey: boolean;

  constructor(
    private afAuth: AngularFireAuth,
    private router: Router,
    private afs: AngularFirestore,
    private snackBar: MatSnackBar,
    private fns: AngularFireFunctions
  ) {
    this.afAuth.authState.subscribe(async (firebaseUser) => {

      this.unsubscribeUserIntervalReloadSub();
      this.unsubscribeUserDocSub();

      if (firebaseUser) {

        // pre 30 min
        this.userIntervalReloadSub = interval(1800000).subscribe(() => {
          this.afAuth.currentUser.then((user) => {
            if (user) {
              user.reload().then(() => {
                console.log('inactive user reloaded');
              });
            }
          });
        });

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
          // isAnonymous: firebaseUser.isAnonymous,
          // providerId: firebaseUser.isAnonymous ? 'Anonymous' : firebaseUser.providerData[0].providerId,
          firebaseUser,
          idTokenResult: null
        };

        if (this.userDocSub && !this.userDocSub.closed) {
          this.userDocSub.unsubscribe();
        }

        this.userDocSub = this.afs.doc<EncryptedUser>(`users/${user.uid}`).snapshotChanges().pipe(
          catchError((error: HTTPError) => {
            if (error.code === 'permission-denied') {
              this.signOut();
            }
            throw error;
          })
        ).subscribe(async (actionUserDocSnap) => {

          if (user.idTokenResult?.claims.secretKey) {
            await this.userPostAction(actionUserDocSnap, user);
            return;
          }

          this.isWaitingForCryptoKey = true;

          this.getIdTokenResult(user).pipe(
            mergeMap((idTokenResult) => {

              if (!idTokenResult.claims.secretKey) {

                return this.getTokenWithSecretKey().pipe(
                  mergeMap((token) => {
                    return this.loginWithSecuredToken(token)
                  }),
                  mergeMap((userCredential: UserCredential) => {
                    user.firebaseUser = userCredential.user;
                    return this.getReloadedFirebaseUser(user);
                  }),
                  mergeMap((firebaseUser: firebase.User) => {
                    user.firebaseUser = firebaseUser;
                    return this.getIdTokenResult(user);
                  }),
                  mergeMap((idTokenResult: firebase.auth.IdTokenResult) => {
                    return this.getCryptoKeyFromSecretKey(idTokenResult.claims.secretKey).pipe(
                      mergeMap((cryptoKey: CryptoKey) => {
                        return of({cryptoKey, idTokenResult});
                      })
                    );
                  })
                )
              }

              return this.getCryptoKeyFromSecretKey(idTokenResult.claims.secretKey).pipe(
                mergeMap((cryptoKey) => of({cryptoKey, idTokenResult}))
              )
            })
          ).subscribe(async (action: {cryptoKey: CryptoKey, idTokenResult: firebase.auth.IdTokenResult}) => {

            if (action.idTokenResult.claims.isAnonymous) {
              user.isAnonymous = true;
              user.providerId = 'Anonymous';
            } else {
              user.isAnonymous = user.firebaseUser.isAnonymous;
              user.providerId = user.firebaseUser.providerData[0].providerId;
            }

            user.cryptoKey = action.cryptoKey;
            user.idTokenResult = action.idTokenResult;
            await this.userPostAction(actionUserDocSnap, user);
          });
        });
      } else {
        this.isWaitingForCryptoKey = false;
        this.user$.next(null);
        this.isUserDecrypted$.next(false);
        this.whileLoginIn = false;
        asyncScheduler.schedule(() => this.router.navigate(['/']));
      }
    });
  }

  getIdTokenResult(user: User) {
    return of(user.firebaseUser.getIdTokenResult(true)).pipe(
      mergeMap(async (promiseIdTokenResult) => {
        return await promiseIdTokenResult;
      })
    );
  }

  getTokenWithSecretKey(): Observable<string> {
    return this.fns.httpsCallable<null, string>('getSecuredToken')(null);
  }

  loginWithSecuredToken(tokenWithSecretKey: string): Observable<UserCredential> {
    return of(this.afAuth.signInWithCustomToken(tokenWithSecretKey)).pipe(
      mergeMap((userCredential) => userCredential)
    );
  }

  getCryptoKeyFromSecretKey(secretKey: string): Observable<CryptoKey> {
    return of(crypto.subtle.importKey(
      'raw',
      Buffer.from(secretKey, 'hex'),
      {
        name: 'AES-GCM'
      },
      false,
      ['decrypt']
    )).pipe(
      mergeMap((p) => p)
    );
  }

  getReloadedFirebaseUser(user: User): Observable<firebase.User> {
    return of(user.firebaseUser.reload().then(async () => await this.afAuth.currentUser)).pipe(
      mergeMap((p) => p)
    );
  }

  async userPostAction(actionUserDocSnap, user: User): Promise<void> {

    this.isWaitingForCryptoKey = false;

    if (actionUserDocSnap.payload.data()?.rounds) {
      user.rounds = JSON.parse(await decrypt(actionUserDocSnap.payload.data()?.rounds, user.cryptoKey));
    }

    this.user$.next(user);
    this.whileLoginIn = false;
    this.isUserDecrypted$.next(true);
  }

  googleSignIn(): void {
    this.whileLoginIn = true;

    this.afAuth.signInWithRedirect(new GoogleAuthProvider()).catch(() => {
      this.snackBar.open('Some went wrong 🤫 Try again 🙂');
    }).finally(() => {
      this.whileLoginIn = false;
    });
  }

  anonymouslySignIn(): void {
    this.whileLoginIn = true;

    this.afAuth.signInAnonymously().catch(() => {
      this.snackBar.open('Some went wrong 🤫 Try again 🙂');
      this.whileLoginIn = false;
    }).then(() => {
      this.router.navigate(['/', RouterDict.user, RouterDict.rounds, RouterDict.roundsList]);
    });
  }

  unsubscribeUserDocSub(): void {
    if (this.userDocSub && !this.userDocSub.closed) {
      this.userDocSub.unsubscribe();
    }
  }

  unsubscribeUserIntervalReloadSub(): void {
    if (this.userIntervalReloadSub && !this.userIntervalReloadSub.closed) {
      this.userIntervalReloadSub.unsubscribe();
    }
  }

  signOut(): Promise<void> {
    return this.afAuth.signOut();
  }
}
