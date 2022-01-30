import {Injectable} from '@angular/core';
import {AngularFireAuth} from '@angular/fire/compat/auth';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {AngularFireFunctions} from '@angular/fire/compat/functions';
import {Router} from '@angular/router';
import {BehaviorSubject, interval, Subscription} from 'rxjs';
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
  firstLoginChecking = true;
  userIntervalReloadSub: Subscription;
  userIsReady$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

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

        this.userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified,
          symmetricKey: {
            cryptoKey: null,
            string: null
          }
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
          if (!this.userIsReady$.value) {
            this.appService.dbIsReady$
              .pipe(
                filter((isReady) => isReady === 'will not' || isReady),
                take(1)
              ).subscribe(async (isReady) => {

              // get key if tre is no db or key in db

              if (isReady === 'will not') {
                // get key to string from request
                // request
                await this.getSymmetricKey(user, actionUserDocSnap).then((key) => {
                  if (key) {
                    this.userData.symmetricKey.string = key;
                    this.userIsReady$.next(true);
                  }
                });
              } else if (isReady) {

                // get key from db or request
                const key = await this.appService.getFromDb('remember-me-database-keys', user.uid);

                if (key) {
                  this.userData.symmetricKey.cryptoKey = key;
                  this.userIsReady$.next(true);
                } else {
                  // request
                  await this.getSymmetricKey(user, actionUserDocSnap).then(async (key) => {
                    try {

                      console.log(key);

                      this.userData.symmetricKey.cryptoKey = await crypto.subtle.importKey(
                        'raw',
                        Buffer.from(key),
                        {
                          name: 'AES-CBC'
                        },
                        false,
                        ['decrypt']
                      );

                      console.log(this.userData.symmetricKey.cryptoKey);
                      await this.appService.addToDb('remember-me-database-keys', user.uid, this.userData.symmetricKey.cryptoKey);
                    } catch (e) {
                      console.error(e);
                      this.userData.symmetricKey.string = key;
                    }

                    this.userIsReady$.next(true);
                  });
                }
              }
            });
          } else {

            if (this.userIntervalReloadSub && !this.userIntervalReloadSub.closed) {
              this.userIntervalReloadSub.unsubscribe();
            }

            this.userIntervalReloadSub = interval(1000 * 60 * 10).subscribe(() => {
              this.afAuth.currentUser.then((user) => {
                if (user) {
                  user.reload();
                }
              });
            });

            let rounds = [];

            if (actionUserDocSnap.payload.data()?.rounds) {
              rounds = JSON.parse(await decrypt(actionUserDocSnap.payload.data()?.rounds, this.userData.symmetricKey));
            }

            this.user$.next({
              rounds
            });
          }
        });
      } else {
        this.userData = null;
        this.router.navigate(['/']);
      }

      this.firstLoginChecking = false;
    });
  }

  async getSymmetricKey(user, actionUserDocSnap): Promise<string> {
    const hasSymmetricKey = actionUserDocSnap.payload.data()?.hasSymmetricKey;
    if (typeof hasSymmetricKey === 'boolean' && hasSymmetricKey) {

      return await user.getIdTokenResult(true).then((token) => {
        if (!token.claims.encryptedSymmetricKey) {
          console.log('should reload');

          user.reload().then(() => {
            console.log('user reloaded');
          });

          return undefined;
        } else {
          return this.fns.httpsCallable('getSymmetricKey')(null).toPromise();
        }
      });
    }
  }

  get isLoggedIn(): boolean | null {

    if (this.firstLoginChecking && !this.userData) {
      return null;
    }

    return !this.firstLoginChecking && !!this.userData;
  }

  googleLogin(): void {
    this.whileLoginIn = true;

    this.afAuth.signInWithRedirect(new GoogleAuthProvider()).catch(() => {
      this.snackBar.open('Some went wrong 🤫 Try again 🙂');
    }).finally(() => {
      this.whileLoginIn = false;
    });
  }

  facebookLogin(): void {
    this.whileLoginIn = true;

    this.afAuth.signInWithRedirect(new FacebookAuthProvider()).catch(() => {
      this.snackBar.open('Some went wrong 🤫 Try again 🙂');
    }).then(() => {
      this.router.navigate(['/', RouterDict.user, RouterDict.rounds, RouterDict.roundsList]);
    }).finally(() => {
      this.whileLoginIn = false;
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
    return this.afAuth.signOut().then(() => {
      this.userData = null;
      return this.router.navigate(['/']);
    });
  }
}
