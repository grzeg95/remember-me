import {Injectable, NgZone} from '@angular/core';
import {AngularFireAuth} from '@angular/fire/auth';
import {AngularFirestore} from '@angular/fire/firestore';
import {Router} from '@angular/router';
import {auth, User} from 'firebase/app';
import {interval, Observable, of, Subscription} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {HTTPError} from '../user/models';
import {UserData} from './user-data.model';

@Injectable()
export class AuthService {

  userData: UserData;
  user$: Observable<User>;
  userDoc$: Subscription;
  whileLoginIn = false;
  firstLoginChecking = true;

  constructor(
    private afAuth: AngularFireAuth,
    private router: Router,
    private ngZone: NgZone,
    private afs: AngularFirestore
  ) {

    this.user$ = this.afAuth.authState;

    this.user$.subscribe((user: User) => {

      if (user) {

        if (this.userDoc$ && !this.userDoc$.closed) {
          this.userDoc$.unsubscribe();
        }

        this.userDoc$ = this.afs.doc(`users/${user.uid}`).snapshotChanges().pipe(
          catchError((error: HTTPError) => {
            if (error.code === 'permission-denied') {
              this.signOut();
              return of(null);
            }
            throw error;
          })
        ).subscribe();

        this.userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified
        };
      } else if (!this.whileLoginIn) {
        this.userData = null;
        this.router.navigate(['/']);
      }

      this.firstLoginChecking = false;

    });

    interval(1000 * 60 * 10).subscribe(() => {
      if (this.afAuth.auth.currentUser) {
        this.afAuth.auth.currentUser.reload();
      }
    });

  }

  get isLoggedIn(): boolean | null {

    const emailVerified = (this.userData && this.userData.emailVerified !== false);

    if (typeof emailVerified === 'undefined') {
      return null;
    }

    if (!this.firstLoginChecking && typeof emailVerified === 'object') {
      return false;
    }

    return !this.firstLoginChecking && emailVerified;

  }

  auth(): void {
    this.googleAuth();
  }

  googleAuth(): void {
    this.whileLoginIn = true;

    this.afAuth.auth.signInWithRedirect(new auth.GoogleAuthProvider()).then(() => {
      return this.ngZone.run(() => {
        this.whileLoginIn = false;
        this.router.navigate(['/u/t']);
      });
    }).catch((error) => {
      console.error(error);
      this.whileLoginIn = false;
    });

  }

  signOut(): Promise<boolean> {
    this.userDoc$.unsubscribe();
    return this.afAuth.auth.signOut().then(() => {
      this.userData = null;
      return this.router.navigate(['/']);
    });
  }

}
