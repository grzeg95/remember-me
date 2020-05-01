import {Injectable, NgZone} from '@angular/core';
import {AngularFireAuth} from '@angular/fire/auth';
import {AngularFirestore} from '@angular/fire/firestore';
import {Router} from '@angular/router';
import * as firebase from 'firebase';
import {auth, User} from 'firebase/app';
import {BehaviorSubject} from 'rxjs';
import {RouterDict} from '../app.constants';
import {IUser} from './i-user';
import GoogleAuthProvider = firebase.auth.GoogleAuthProvider;

@Injectable()
export class AuthService {

  userData: IUser;
  whileLoginIn$: BehaviorSubject<boolean> = new BehaviorSubject(false);

  constructor(
    private afs: AngularFirestore,
    private afAuth: AngularFireAuth,
    private router: Router,
    private ngZone: NgZone) {

    this.afAuth.authState.subscribe((user) => {

      if (user) {

        this.userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        };

        localStorage.setItem('user', JSON.stringify(this.userData));
        this.registerUser(this.userData);

        if (!this.router.url.startsWith(RouterDict['user'])) {
          return this.router.navigate(['/' + RouterDict['user'] + '/' + RouterDict['today']]);
        }

      } else {
        localStorage.setItem('user', null);
        return this.router.navigate(['/']);
      }

    });

  }

  get isLoggedIn(): boolean {

    const user = JSON.parse(localStorage.getItem('user'));

    if (user) {
      this.userData = user;
    }

    return (user !== null && user?.emailVerified !== false);

  }

  googleAuth(): void {
    this.authLogin(new auth.GoogleAuthProvider());
  }

  authLogin(provider: GoogleAuthProvider): void {

    this.whileLoginIn$.next(true);

    this.afAuth.auth.signInWithPopup(provider).then(() => {
      return this.ngZone.run(() => {
        this.whileLoginIn$.next(false);
        return this.router.navigate(['/' + RouterDict['user'] + '/' + RouterDict['tasks-list']]);
      });
    }).catch((error) => {
      this.whileLoginIn$.next(false);
      console.error(error);
    });

  }

  registerUser(user: IUser): void {

    this.afs.doc(`users/${user.uid}`).set(user, {
      merge: true
    }).catch(() => this.signOut());

  }

  signOut(): Promise<boolean> {
    return this.afAuth.auth.signOut().then(() => {
      this.userData = {} as User;
      localStorage.setItem('user', null);
      return this.router.navigate(['/']);
    });
  }

}
