import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Inject, Injectable, NgZone} from '@angular/core';
import {AngularFireAuth} from '@angular/fire/auth';
import {Router} from '@angular/router';
import * as auth0 from 'auth0-js';
import {auth, User} from 'firebase/app';
import {interval, Observable} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {environment} from '../../environments/environment';
import {UserData} from './user-data.model';

@Injectable()
export class AuthService {

  auth0: any;
  userData: UserData;
  user$: Observable<User>;
  whileLoginIn = false;
  firstLoginChecking = true;

  constructor(
    private afAuth: AngularFireAuth,
    private router: Router,
    private ngZone: NgZone,
    private http: HttpClient,
    @Inject(Window) private window: Window
  ) {

    if (!environment.production) {
      this.auth0 = new auth0.WebAuth({
        clientID: environment.auth0.clientId,
        domain: environment.auth0.clientDomain,
        responseType: 'token',
        redirectUri: environment.auth0.redirect.replace('{{origin}}', this.window.location.origin),
        audience: environment.auth0.audience,
        scope: environment.auth0.scope
      });
    }

    this.user$ = this.afAuth.authState;

    this.user$.subscribe((user: User) => {

      if (user) {
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
    if (!environment.production) {
      this.auth0Auth();
    } else {
      this.googleAuth();
    }
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

  auth0Auth(): void {
    this.auth0.authorize();
  }

  auth0HandleLoginCallback(): void {
    this.whileLoginIn = true;

    this.auth0.parseHash((err, authResult) => {
      if (authResult && authResult.accessToken) {

        this.http.get(environment.functions.auth0, {
          headers: new HttpHeaders().set('Authorization', `Bearer ${authResult.accessToken}`)
        }).pipe(catchError((error) => {
          this.whileLoginIn = false;
          this.router.navigate(['/']);
          throw error;
        })).subscribe((res: {firebaseToken: string}) => {
          this.afAuth.auth.signInWithCustomToken(res.firebaseToken).then(() => {
            return this.ngZone.run(() => {
              this.whileLoginIn = false;
              return this.router.navigate(['/u/t']);
            });
          }).catch(() => {
            this.whileLoginIn = false;
            this.router.navigate(['/']);
          });
        });

      } else if (err) {
        this.whileLoginIn = false;
        this.router.navigate(['/']);
      } else {
        this.whileLoginIn = false;
      }
    });
  }

  signOut(): Promise<boolean> {
    return this.afAuth.auth.signOut().then(() => {
      this.userData = null;
      return this.router.navigate(['/']);
    });
  }

}
