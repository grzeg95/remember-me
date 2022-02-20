import {Injectable} from '@angular/core';
import {AngularFireAuth} from '@angular/fire/compat/auth';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {AngularFireFunctions} from '@angular/fire/compat/functions';
import {Router} from '@angular/router';
import firebase from 'firebase/compat';
import {BehaviorSubject, interval, Subscription, timer} from 'rxjs';
import {catchError, filter, take} from 'rxjs/operators';
import {AppService} from '../app-service';
import {decrypt} from '../security';
import {HTTPError} from '../user/models';
import {User, UserData, EncryptedUser} from './user-data.model';
import {GoogleAuthProvider, FacebookAuthProvider} from 'firebase/auth';
import {MatSnackBar} from '@angular/material/snack-bar';
import {RouterDict} from '../app.constants';
import {Buffer} from 'buffer';

@Injectable()
export class AuthService {

  userData: UserData;
  user$: BehaviorSubject<User> = new BehaviorSubject<User>(null);
  userDocSub: Subscription;
  whileLoginIn = false;
  userIntervalReloadSub: Subscription;
  dbIsReadySub: Subscription;
  isUserLoggedIn$: BehaviorSubject<boolean | null> = new BehaviorSubject<boolean | null>(null);
  userIsReady$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  firebaseUser: firebase.User;

  constructor(
    private afAuth: AngularFireAuth,
    private router: Router,
    private afs: AngularFirestore,
    private snackBar: MatSnackBar,
    private fns: AngularFireFunctions,
    private appService: AppService
  ) {
    this.afAuth.authState.subscribe((user) => {

      this.unsubscribeUserIntervalReloadSub();
      this.unsubscribeUserDocSub();

      if (user) {

        this.whileLoginIn = false;
        this.firebaseUser = user;
        this.isUserLoggedIn$.next(true);

        // pre 30 min
        this.userIntervalReloadSub = interval(1800000).subscribe(() => {
          this.afAuth.currentUser.then((user) => {
            if (user) {
              user.reload().then(() => {
                console.log('user reloaded');
              });
            }
          });
        });

        if (!crypto.subtle) {
          this.signOut();
          this.snackBar.open('Stop using IE lol');
          return;
        }

        this.userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified,
          cryptoKey: null,
          isAnonymous: user.isAnonymous,
          providerId: user.isAnonymous ? 'Anonymous' : user.providerData[0].providerId
        };

        if (this.userDocSub && !this.userDocSub.closed) {
          this.userDocSub.unsubscribe();
        }

        // wait until user has rsa private key
        this.userDocSub = this.afs.doc<EncryptedUser>(`users/${user.uid}`).snapshotChanges().pipe(
          catchError((error: HTTPError) => {
            if (error.code === 'permission-denied') {
              this.signOut();
            }
            throw error;
          })
        ).subscribe(async (actionUserDocSnap) => {

          if (this.dbIsReadySub && !this.dbIsReadySub.closed) {
            this.dbIsReadySub.unsubscribe();
          }

          this.dbIsReadySub = this.appService.dbIsReady$
            .pipe(
              filter((isReady) => isReady === 'will not' || isReady),
              take(1)
            ).subscribe(async () => {

              // get key if tre is no db or key in db

              // get key from db or request
              let userFromIndexedDB;
              try {

                // get all users and delete others
                const usersFromDb = await this.appService.getMapOfUsersCryptoKeysFromDb();

                if (usersFromDb[user.uid] && usersFromDb[user.uid]) {
                  userFromIndexedDB = usersFromDb[user.uid];
                }

                const usersToRemovePromise = [];

                for (const id of Object.getOwnPropertyNames(usersFromDb)) {
                  if (id !== user.uid && usersFromDb[id]) {
                    usersToRemovePromise.push(this.appService.deleteFromDb('remember-me-database-keys', id));
                  }
                }

                await Promise.all(usersToRemovePromise);
              } catch (e) {
              }

              // try to decrypt user uid
              // remove it if user was e.g. removed and there is new one witch the same id
              if (userFromIndexedDB) {
                try {

                  const cryptoTest: {
                    test: number[],
                    result: number
                  } = JSON.parse(await decrypt(actionUserDocSnap.payload.data().cryptoKeyTest, userFromIndexedDB.cryptoKey));

                  if (cryptoTest.test[0] + cryptoTest.test[1] !== cryptoTest.result) {
                    throw new Error(`crypto test error`);
                  }

                } catch (e) {
                  userFromIndexedDB = undefined;

                  try {
                    await this.appService.deleteFromDb('remember-me-database-keys', user.uid);
                  } catch (e) {
                  }
                }
              }

              if (userFromIndexedDB) {
                this.userData.cryptoKey = userFromIndexedDB.cryptoKey;
                await this.prepareUser(actionUserDocSnap);
              } else {
                // request
                await this.getSymmetricKey(user, actionUserDocSnap).then(async (key) => {

                  // create crypto key

                  this.userData.cryptoKey = await crypto.subtle.importKey(
                    'raw',
                    Buffer.from(key, 'hex'),
                    {
                      name: 'AES-GCM'
                    },
                    false,
                    ['decrypt']
                  );

                  // try to store user crypto key to indexedDB
                  try {
                    await this.appService.addToDb('remember-me-database-keys', user.uid, {
                      cryptoKey: this.userData.cryptoKey
                    });
                  } catch (e) {
                  }
                }).catch(() => {
                  timer(3000).pipe(take(1)).subscribe(() => {
                    user.reload().then(() => {
                      console.log('user reloaded');
                    });
                  });
                }).then(async () => await this.prepareUser(actionUserDocSnap));
              }
            });
        });
      } else {
        this.userData = null;
        this.isUserLoggedIn$.next(false);
        this.router.navigate(['/']);
      }
    });
  }

  async prepareUser(actionUserDocSnap): Promise<void> {
    let rounds = [];

    if (actionUserDocSnap.payload.data()?.rounds) {
      rounds = JSON.parse(await decrypt(actionUserDocSnap.payload.data()?.rounds, this.userData.cryptoKey));
    }

    this.user$.next({
      rounds
    });
    this.userIsReady$.next(true);
  }

  async getSymmetricKey(user, actionUserDocSnap): Promise<string> {
    const hasSymmetricKey = actionUserDocSnap.payload.data()?.hasSymmetricKey;
    if (typeof hasSymmetricKey === 'boolean' && hasSymmetricKey) {

      return await user.getIdTokenResult(true).then((token) => {
        if (!token.claims.encryptedSymmetricKey) {
          throw new Error('user without symmetric key');
        } else {
          return this.fns.httpsCallable('getSymmetricKey')(null).toPromise();
        }
      });
    } else {
      throw new Error('user without symmetric key');
    }
  }

  googleSignIn(): void {
    this.whileLoginIn = true;

    this.afAuth.signInWithRedirect(new GoogleAuthProvider()).catch(() => {
      this.snackBar.open('Some went wrong 🤫 Try again 🙂');
    }).finally(() => {
      this.whileLoginIn = false;
    });
  }

  facebookSignIn(): void {
    this.whileLoginIn = true;

    this.afAuth.signInWithRedirect(new FacebookAuthProvider()).catch(() => {
      this.snackBar.open('Some went wrong 🤫 Try again 🙂');
    }).then(() => {
      this.router.navigate(['/', RouterDict.user, RouterDict.rounds, RouterDict.roundsList]);
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

  signOut(): Promise<boolean> {
    this.unsubscribeUserIntervalReloadSub();
    this.unsubscribeUserDocSub();
    this.userIsReady$.next(false);
    return this.afAuth.signOut().then(() => {
      this.userData = null;
      return this.router.navigate(['/']);
    });
  }
}
