import {Injectable} from '@angular/core';
import {AngularFireAuth} from '@angular/fire/compat/auth';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {AngularFireFunctions} from '@angular/fire/compat/functions';
import {Router} from '@angular/router';
import {BehaviorSubject, interval, Subscription} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {decrypt} from '../security';
import {HTTPError} from '../user/models';
import {User, UserData, EncryptedUser} from './user-data.model';
import {GoogleAuthProvider, FacebookAuthProvider} from 'firebase/auth';
import {MatSnackBar} from '@angular/material/snack-bar';
import {RouterDict} from '../app.constants';

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
    private fns: AngularFireFunctions
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
          emailVerified: user.emailVerified
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
        ).subscribe((actionUserDocSnap) => {

          console.log(actionUserDocSnap.payload.data()?.hasSymmetricKey);

          if (!this.userIsReady$.value) {
            const hasSymmetricKey = actionUserDocSnap.payload.data()?.hasSymmetricKey;
            if (typeof hasSymmetricKey === 'boolean' && hasSymmetricKey) {
              user.getIdTokenResult(true).then((token) => {
                if (!token.claims.encryptedEncryptedKey) {
                  console.log('should reload');
                } else {
                  this.fns.httpsCallable('getSymmetricKey')(null).subscribe((success) => {
                    this.userData.symmetricKey = success;
                    this.userIsReady$.next(true);
                  });
                }
              });
            }
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
              rounds = JSON.parse(decrypt(actionUserDocSnap.payload.data()?.rounds, this.userData.symmetricKey))
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
