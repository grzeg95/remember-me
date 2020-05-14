import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Injectable, NgZone} from '@angular/core';
import {AngularFireAuth} from '@angular/fire/auth';
import {Router} from '@angular/router';
import GoogleAuthProvider = auth.GoogleAuthProvider;
import * as auth0 from 'auth0-js';
import {auth, User} from 'firebase/app';
import {BehaviorSubject, interval, Observable} from 'rxjs';
import {environment} from '../../environments/environment';
import {UserData} from './user-data.model';

@Injectable()
export class AuthService {

  // Create Auth0 web auth instance
  auth0 = new auth0.WebAuth({
    clientID: environment.auth.clientId,
    domain: environment.auth.clientDomain,
    responseType: 'token',
    redirectUri: environment.auth.redirect,
    audience: environment.auth.audience,
    scope: environment.auth.scope
  });

  userData: UserData;
  user$: Observable<User>;
  whileLoginIn$: BehaviorSubject<boolean> = new BehaviorSubject(false);
  firstLoginChecking = true;

  constructor(
    private afAuth: AngularFireAuth,
    private router: Router,
    private ngZone: NgZone,
    private http: HttpClient
  ) {

    this.user$ = this.afAuth.authState;

    this.user$.subscribe((user: User) => {

      if (this.router.url !== '/auth0') {
        if (user) {
          if (user.uid.startsWith('auth0|')) {
            // TODO get user from auth0
            // user.getIdToken().then((token) => this.auth0.client.userInfo(token, (err, profile) => {}));
            this.userData = {
              uid: user.uid,
              email: user.email,
              displayName: null,
              photoURL: null,
              emailVerified: true
            };
          } else {
            this.userData = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              emailVerified: user.emailVerified
            };
          }

        } else {
          this.userData = null;
          this.router.navigate(['/']);
        }
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

  auth0Login(redirect?: string): void {
    const _redirect = redirect ? redirect : this.router.url;
    localStorage.setItem('auth_redirect', _redirect);
    this.auth0.authorize();
  }

  handleAuth0LoginCallback(): void {

    this.auth0.parseHash((err, authResult) => {

      if (authResult && authResult.accessToken) {
        window.location.hash = '';
        this.whileLoginIn$.next(true);

        this.http.get(`http://localhost:1337/`, {
          headers: new HttpHeaders().set('Authorization', `Bearer ${authResult.accessToken}`)
        }).subscribe((res: {firebaseToken: string}) => {
          this.afAuth.auth.signInWithCustomToken(res.firebaseToken).then(() => {
            return this.ngZone.run(() => {
              this.whileLoginIn$.next(false);
              return this.router.navigate(['/u/t']);
            });
          }).catch((error) => {
            console.error(error);
            this.whileLoginIn$.next(false);
          });
        });

      } else if (err) {
        this.router.navigate(['/']);
        console.error(`Error authenticating: ${err.error}`);
      }
    });
  }

}
