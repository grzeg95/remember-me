import {EventEmitter, Injectable, NgZone} from '@angular/core';
import {AngularFireAuth} from '@angular/fire/auth';
import {AngularFirestore} from '@angular/fire/firestore';
import {Router} from '@angular/router';
import * as firebase from 'firebase';
import {auth} from 'firebase/app';
import {IUserAuth} from './user.auth';
import GoogleAuthProvider = firebase.auth.GoogleAuthProvider;

@Injectable()
export class AuthService {

  userData: IUserAuth = {
    uid: '',
    email: '',
    displayName: '',
    photoURL: ''
  };

  isLoggedEventEmitter: EventEmitter<boolean>;

  constructor(
    private afs: AngularFirestore,
    public afAuth: AngularFireAuth,
    public router: Router,
    public ngZone: NgZone
  ) {

    this.isLoggedEventEmitter = new EventEmitter<boolean>();

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

        if (!this.router.url.startsWith('/user')) {
          return this.router.navigate(['/user/today']);
        }

      } else {
        localStorage.setItem('user', null);
        this.isLoggedEventEmitter.emit(this.isLoggedIn);
        return this.router.navigate(['/']);
      }

    });

  }

  get isLoggedIn(): boolean {

    const user = JSON.parse(localStorage.getItem('user'));

    if (user) {
      this.userData = user;
    }

    return (user !== null && user.emailVerified !== false);

  }

  googleAuth(): void {
    this.authLogin(new auth.GoogleAuthProvider());
  }

  authLogin(provider: GoogleAuthProvider): void {

    this.afAuth.auth.signInWithPopup(provider).then(() => {
      return this.ngZone.run(() => {
        return this.router.navigate(['/user/tasks-list']);
      });
    }).catch((error) => {
      console.error(error);
    });

  }

  registerUser(user: IUserAuth): void {

    this.afs.doc(`users/${user.uid}`).set(this.userData, {
      merge: true
    }).catch((error) => {
      console.log(error);
    }).then(() => {
      this.isLoggedEventEmitter.emit(this.isLoggedIn);
    });

  }

  signOut(): Promise<boolean> {

    return this.afAuth.auth.signOut().then(() => {

      this.userData = {
        uid: '',
        email: '',
        displayName: '',
        photoURL: ''
      };

      localStorage.setItem('user', null);
      return this.router.navigate(['/']);

    });

  }

}
