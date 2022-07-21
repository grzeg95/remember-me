import {Injectable} from '@angular/core';
import {AngularFireAuth} from '@angular/fire/compat/auth';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {AngularFireFunctions} from '@angular/fire/compat/functions';
import {Router} from '@angular/router';
import firebase from 'firebase/compat';
import {BehaviorSubject, interval, lastValueFrom, Subscription} from 'rxjs';
import {catchError, filter, take} from 'rxjs/operators';
import {AppService} from '../app-service';
import {decrypt} from '../security';
import {HTTPError} from '../user/models';
import {User, EncryptedUser} from './user-data.model';
import {GoogleAuthProvider} from 'firebase/auth';
import {MatSnackBar} from '@angular/material/snack-bar';
import {RouterDict} from '../app.constants';
import {Buffer} from 'buffer';

@Injectable()
export class AuthService {

  user$: BehaviorSubject<User> = new BehaviorSubject<User>(undefined);
  isUserLoggedIn$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(undefined);
  userDocSub: Subscription;
  whileLoginIn = false;
  userIntervalReloadSub: Subscription;
  dbIsReadySub: Subscription;

  constructor(
    private afAuth: AngularFireAuth,
    private router: Router,
    private afs: AngularFirestore,
    private snackBar: MatSnackBar,
    private fns: AngularFireFunctions,
    private appService: AppService
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
          isAnonymous: firebaseUser.isAnonymous,
          providerId: firebaseUser.isAnonymous ? 'Anonymous' : firebaseUser.providerData[0].providerId,
          firebaseUser
        };

        if (this.userDocSub && !this.userDocSub.closed) {
          this.userDocSub.unsubscribe();
        }

        // wait until user has rsa private key
        this.userDocSub = this.afs.doc<EncryptedUser>(`users/${ user.uid }`).snapshotChanges().pipe(
          catchError((error: HTTPError) => {
            if (error.code === 'permission-denied') {
              this.signOut();
            }
            throw error;
          })
        ).subscribe(async (actionUserDocSnap) => {

          // wait for user private key
          const cryptoKeyTest = actionUserDocSnap.payload.data()?.cryptoKeyTest;

          if (typeof cryptoKeyTest === 'string' && cryptoKeyTest.length) {

            // check if user has stored
            if (this.dbIsReadySub && !this.dbIsReadySub.closed) {
              this.dbIsReadySub.unsubscribe();
            }

            this.dbIsReadySub = this.appService.dbIsReady$
              .pipe(
                filter((isReady) => isReady === 'will not' || isReady),
                take(1)
              ).subscribe(async () => {

                // get key if tre is no db or key in db

                // get key from db
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
                      return new Error(`crypto test error`);
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
                  user.cryptoKey = userFromIndexedDB.cryptoKey;
                  await this.userPostAction(actionUserDocSnap, user);
                } else {
                  // request
                  await this.getSymmetricKey(user.firebaseUser).then(async (key) => {

                    // create crypto key

                    user.cryptoKey = await crypto.subtle.importKey(
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
                        cryptoKey: user.cryptoKey
                      });
                    } catch (e) {
                    }
                  }).catch((e) => {
                    this.snackBar.open(e);
                    this.signOut();
                  }).then(async () => await this.userPostAction(actionUserDocSnap, user));
                }

              });
          }
        });
      } else {
        this.user$.next(null);
        this.isUserLoggedIn$.next(false);
        this.whileLoginIn = false;
        await this.appService.removeAllUsers();
        this.router.navigate(['/']);
      }
    });
  }

  async userPostAction(actionUserDocSnap, user: User): Promise<void> {

    if (actionUserDocSnap.payload.data()?.rounds) {
      user.rounds = JSON.parse(await decrypt(actionUserDocSnap.payload.data()?.rounds, user.cryptoKey));
    }

    this.user$.next(user);
    this.whileLoginIn = false;
    this.isUserLoggedIn$.next(true);
  }

  async getSymmetricKey(user: firebase.User): Promise<string> {
    return await user.getIdTokenResult(true).then((token) => {
      if (!token.claims.encryptedSymmetricKey) {
        throw new Error('user without symmetric key');
      } else {
        return lastValueFrom(this.fns.httpsCallable('getSymmetricKey')(null));
      }
    });
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
