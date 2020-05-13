import {Injectable, NgZone} from '@angular/core';
import {AngularFireAuth} from '@angular/fire/auth';
import {Router} from '@angular/router';
import {auth, User} from 'firebase/app';
import {BehaviorSubject, interval, Observable} from 'rxjs';
import {UserData} from './user-data.model';
import GoogleAuthProvider = auth.GoogleAuthProvider;

@Injectable()
export class AuthService {

  userData: UserData;
  user$: Observable<User>;
  whileLoginIn$: BehaviorSubject<boolean> = new BehaviorSubject(false);
  firstLoginChecking = true;

  constructor(
    private afAuth: AngularFireAuth,
    private router: Router,
    private ngZone: NgZone
  ) {

    this.user$ = this.afAuth.authState;

    this.user$.subscribe((user) => {

      if (user) {

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

    interval(1000 * 60 * 10).subscribe(() => {
      if (this.afAuth.auth.currentUser) {
        this.afAuth.auth.currentUser.reload();
      }
    });

  }

  get isLoggedIn(): boolean | null {

    const a = !this.firstLoginChecking;
    const b = (this.userData && this.userData.emailVerified !== false);

    if (!a && typeof b === 'undefined') {
      return null;
    }

    if (a && typeof b === 'object') {
      return false;
    }

    return a && b;

  }

  googleAuth(): void {
    this.authLogin(new auth.GoogleAuthProvider());
  }

  authLogin(provider: GoogleAuthProvider): void {

    this.whileLoginIn$.next(true);

    this.afAuth.auth.signInWithRedirect(provider).then(() => {
      return this.ngZone.run(() => {
        this.whileLoginIn$.next(false);
        return this.router.navigate(['/u/t']);
      });
    }).catch((error) => {
      console.error(error);
      this.whileLoginIn$.next(false);
    });

  }

  signOut(): Promise<boolean> {
    return this.afAuth.auth.signOut().then(() => {
      this.userData = null;
      return this.router.navigate(['/']);
    });
  }

}
