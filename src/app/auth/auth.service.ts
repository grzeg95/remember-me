import {Injectable} from '@angular/core';
import {AngularFireAuth} from '@angular/fire/compat/auth';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {Router} from '@angular/router';
import {BehaviorSubject, interval, Subscription} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {HTTPError} from '../user/models';
import {User, UserData} from './user-data.model';
import { GoogleAuthProvider } from 'firebase/auth';

@Injectable()
export class AuthService {

  userData: UserData;
  user$: BehaviorSubject<User> = new BehaviorSubject<User>(null);
  userDocSub: Subscription;
  whileLoginIn = false;
  firstLoginChecking = true;
  userIntervalReloadSub: Subscription;

  constructor(
    private afAuth: AngularFireAuth,
    private router: Router,
    private afs: AngularFirestore
  ) {

    this.afAuth.authState.subscribe((user) => {

      this.unsubscribeUserIntervalReloadSub();
      this.unsubscribeUserDocSub();

      if (user) {

        this.userIntervalReloadSub = interval(1000 * 60 * 10).subscribe(() => {
          this.afAuth.currentUser.then((user) => {
            if (user) {
              user.reload();
            }
          });
        });

        if (this.userDocSub && !this.userDocSub.closed) {
          this.userDocSub.unsubscribe();
        }

        this.userDocSub = this.afs.doc<User>(`users/${user.uid}`).snapshotChanges().pipe(
          catchError((error: HTTPError) => {
            if (error.code === 'permission-denied') {
              this.signOut();
            }
            throw error;
          })
        ).subscribe((userDoc) => {
          this.user$.next({
            timesOfDay: userDoc.payload.data()?.timesOfDay || []
          });
        });

        this.userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified
        };
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

  async auth(): Promise<void> {
    this.whileLoginIn = true;
    await this.afAuth.signInWithRedirect(new GoogleAuthProvider());
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
