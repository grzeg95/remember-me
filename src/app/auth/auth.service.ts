import {Injectable} from '@angular/core';
import {GoogleAuthProvider, IdTokenResult, UserCredential} from '@angular/fire/auth';
import {deleteField, DocumentSnapshot} from '@angular/fire/firestore';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Router} from '@angular/router';
import {
  AngularFirebaseAuthService,
  AngularFirebaseFirestoreService,
  AngularFirebaseFunctionsService
} from 'angular-firebase';
import {BehaviorSubject, catchError, map, mergeMap, Observable, Subscription, throwError} from 'rxjs';
import {decryptUser, getCryptoKey} from 'services';
import {RouterDict} from '../app.constants';
import {EncryptedUser} from './index';
import {FirebaseUser, User} from './user-data.model';

@Injectable()
export class AuthService {

  user$: BehaviorSubject<User> = new BehaviorSubject<User>(undefined);
  userDocSub: Subscription;
  whileLoginIn$ = new BehaviorSubject<boolean>(false);
  onSnapshotSubs: Subscription[] = [];
  wasUserCreatedWithEmailAndPassword = false;

  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    private angularFirebaseAuthService: AngularFirebaseAuthService,
    private angularFirebaseFirestoreService: AngularFirebaseFirestoreService,
    private angularFirebaseFunctionsService: AngularFirebaseFunctionsService,
  ) {

    this.angularFirebaseAuthService.firebaseUser$.subscribe((firebaseUser) => {

      if (firebaseUser) {

        if (this.wasUserCreatedWithEmailAndPassword) {
          this.wasUserCreatedWithEmailAndPassword = false;
          this.signOut().subscribe();
          return;
        }

        const isAnonymous = firebaseUser.isAnonymous || !firebaseUser.providerData.length;

        // check if email was verified but not anonymous
        if (!isAnonymous && !firebaseUser.emailVerified) {
          this.snackBar.open('Please verify you email 🤫 and try again 🙂');
          this.signOut().subscribe();
          return;
        }

        this.whileLoginIn$.next(true);

        this.userDocSub = this.angularFirebaseFirestoreService.docOnSnapshot<EncryptedUser>(`users/${firebaseUser.uid}`).pipe(catchError((error) => {
          if (error.code === 'permission-denied') {
            this.signOut().subscribe();
          }
          throw error;
        })).subscribe((docSnapEncryptedUser) => {

          // check if user has crypto key
          // decrypt
          // return
          const currentUser = this.user$.value

          if (currentUser) {
            this.userPostActions(currentUser, docSnapEncryptedUser);
          } else if (docSnapEncryptedUser.data()?.hasEncryptedSecretKey) {

            this.getUserData(firebaseUser).subscribe(({cryptoKey, firebaseUser, idTokenResult}) => {

              const newUser: User = {
                cryptoKey,
                photoURL: firebaseUser.photoURL,
                hasCustomPhoto: false,
                firebaseUser
              };

              if (idTokenResult.claims.isAnonymous) {
                newUser.isAnonymous = true;
                newUser.providerId = 'Anonymous';
              } else {
                newUser.isAnonymous = firebaseUser.isAnonymous;
                newUser.providerId = firebaseUser.providerData[0].providerId;
              }

              this.userPostActions(newUser, docSnapEncryptedUser);
            });
          }
        });

      } else {

        this.unsubscribeAllUserSubs();
        this.user$.next(null);
        this.whileLoginIn$.next(false);
        this.router.navigate(['/']);
        this.wasUserCreatedWithEmailAndPassword = false;
      }
    });
  }

  userPostActions(user: User, docSnapEncryptedUser: DocumentSnapshot<EncryptedUser>) {

    decryptUser({
      rounds: docSnapEncryptedUser.data()?.rounds,
      photoURL: docSnapEncryptedUser.data()?.photoURL,
      hasEncryptedSecretKey: docSnapEncryptedUser.data()?.hasEncryptedSecretKey
    }, user.cryptoKey).subscribe((decryptedUser) => {

      if (decryptedUser.rounds) {
        user.rounds = decryptedUser.rounds;
      }

      if (decryptedUser.photoURL) {
        user.photoURL = decryptedUser.photoURL;
        user.hasCustomPhoto = true;
      } else {
        user.photoURL = user.firebaseUser.photoURL;
        user.hasCustomPhoto = false;
      }

      this.user$.next(user);

      if (this.router.routerState.snapshot.url === '/') {
        this.router.navigate(['/', RouterDict.user, RouterDict.rounds, RouterDict.roundsList]).then(() => {
          this.whileLoginIn$.next(false);
        });
      } else {
        this.whileLoginIn$.next(false);
      }
    });
  }

  getUserData(currentFirebaseUser: FirebaseUser): Observable<{firebaseUser: FirebaseUser, cryptoKey: CryptoKey, idTokenResult: IdTokenResult}> {

    return this.angularFirebaseAuthService.getIdTokenResult(currentFirebaseUser, true).pipe(
      mergeMap((idTokenResult) => {

        if (!idTokenResult.claims.secretKey) {

          let firebaseUser: FirebaseUser;

          return this.angularFirebaseFunctionsService.httpsOnRequest<null, string>('getTokenWithSecretKeyUrl', 'text/plain')(null).pipe(
            mergeMap((idTokenResult) => this.angularFirebaseAuthService.signInWithCustomToken(idTokenResult)),
            mergeMap((userCredential) => {
              firebaseUser = userCredential.user;
              return this.angularFirebaseAuthService.getIdTokenResult(firebaseUser, true);
            }),
            mergeMap((newIdTokenResult) => {
              return getCryptoKey(newIdTokenResult.claims.secretKey as string).pipe(map((cryptoKey) => {
                return {
                  idTokenResult: newIdTokenResult,
                  cryptoKey,
                  firebaseUser
                }
              }))
            })
          );
        }

        return getCryptoKey(idTokenResult.claims.secretKey as string).pipe(map((cryptoKey) => {
          return {
            idTokenResult,
            cryptoKey,
            firebaseUser: currentFirebaseUser
          }
        }));
      })
    );
  }

  googleSignIn(): Observable<void> {

    // is not logged in
    if (!this.user$.value) {
      this.whileLoginIn$.next(true);

      return this.angularFirebaseAuthService.signInWithRedirect(new GoogleAuthProvider()).pipe(catchError((e) => {
        this.whileLoginIn$.next(false);
        throw e;
      }));
    }

    return throwError(() => {
    });
  }

  anonymouslySignIn(): Observable<UserCredential | void> {

    // is not logged in
    if (!this.user$.value) {
      this.whileLoginIn$.next(true);

      return this.angularFirebaseAuthService.signInAnonymously().pipe(catchError((e) => {
        this.whileLoginIn$.next(false);
        throw e;
      }));
    }

    return throwError(() => {
    });
  }

  signInWithEmailAndPassword(email: string, password: string): Observable<UserCredential | void> {

    // is not logged in
    if (!this.user$.value) {
      this.whileLoginIn$.next(true);

      return this.angularFirebaseAuthService.signInWithEmailAndPassword(email, password).pipe(catchError((e) => {
        this.whileLoginIn$.next(false);
        throw e;
      }));
    }

    return throwError(() => {
    });
  }

  createUserWithEmailAndPassword(email: string, password: string): Observable<{code: string, message: string}> {

    // is not logged in
    if (!this.user$.value) {
      this.wasUserCreatedWithEmailAndPassword = true;

      return this.angularFirebaseAuthService.createUserWithEmailAndPassword(email, password).pipe(
        catchError((error: {code: string, message: string}) => {
          if (error.code === 'auth/weak-password') {
            error.message = 'Password should has at least 6 characters 😩';
          }

          if (error.code === 'auth/email-already-in-use') {
            error.message = 'Email already in use 😕 Try other 🧐';
          }

          throw error;
        }),
        mergeMap((userCredential) => {
          return this.angularFirebaseAuthService.sendEmailVerification(userCredential.user).pipe(
            catchError(() => {
              throw {
                code: 'user-created',
                message: 'User has been created 🤗 Please try to login 🙈'
              }
            }),
            map(() => {
              return {
                code: 'user-created',
                message: 'User has been created 🤗 To login verify your email address by link in that has been sent to you 🧐'
              };
            })
          )
        }));
    }

    return throwError(() => {
    });
  }

  sendEmailVerification(user: FirebaseUser): Observable<void> {

    // is not logged in
    if (!this.user$.value) {
      return this.angularFirebaseAuthService.sendEmailVerification(user);
    }

    return throwError(() => {
    });
  }

  sendPasswordResetEmail(email: string): Observable<void> {

    // is not logged in
    if (!this.user$.value) {
      return this.angularFirebaseAuthService.sendPasswordResetEmail(email);
    }

    return throwError(() => {
    });
  }

  updatePassword(newPassword: string): Observable<{code: string; message: string;}> {

    // is not logged in
    // was created by email password

    const user = this.user$.value;

    if (!user && user.firebaseUser.providerData[0]?.providerId !== 'password') {

      return throwError(() => {
        return {
          code: 'auth/unauthorized',
          message: `Password hasn't been updated 🤫`
        }
      });
    }

    return this.angularFirebaseAuthService.updatePassword(user.firebaseUser, newPassword);
  }

  signOut(): Observable<void> {
    return this.angularFirebaseAuthService.signOut();
  }

  deleteUser(): Observable<void> {

    // is logged in
    if (this.user$.value) {
      const user = this.user$.value;
      return this.angularFirebaseAuthService.deleteUser(user.firebaseUser);
    }

    return throwError(() => {
    });
  }

  uploadProfileImage(file: File): Observable<{message: string}> {

    // is logged in
    if (this.user$.value) {
      // max 9MB picture file
      // PayloadTooLargeError: request entity too large
      if (file.size > 9 * 1024 * 1024) {
        return throwError(() => {
          return {
            error: {
              details: 'You can upload up to 9MB image 🙄'
            }
          };
        });
      }

      return this.angularFirebaseFunctionsService.httpsOnRequest<File, {
        message: string
      }>('uploadProfileImageUrl', file.type)(file);
    }

    return throwError(() => {
    });
  }

  removePhoto(): Observable<void> {
    const user = this.user$.value;

    return this.angularFirebaseFirestoreService.updateDoc(`users/${user.firebaseUser.uid}`, {
      photoURL: deleteField()
    });
  }

  unsubscribeUserDocSub(): void {
    if (this.userDocSub && !this.userDocSub.closed) {
      this.userDocSub.unsubscribe();
    }
  }

  unsubscribeAllUserSubs(): void {
    for (const sub of this.onSnapshotSubs) {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    }
    this.onSnapshotSubs = [];

    this.unsubscribeUserDocSub();
  }
}
