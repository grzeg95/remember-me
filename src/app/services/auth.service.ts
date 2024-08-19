import {Inject, Injectable, signal} from '@angular/core';
import {getIdTokenResult, GoogleAuthProvider, UserCredential, User as FirebaseUser} from 'firebase/auth';
import {deleteField, doc, Firestore, updateDoc} from 'firebase/firestore';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Router} from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  defer,
  from,
  map,
  mergeMap,
  NEVER,
  Observable,
  of,
  retry,
  Subscription,
  switchMap,
  throwError,
  zip
} from 'rxjs';
import {RouterDict} from '../app.constants';
import {FirestoreInjectionToken} from '../models/firebase';
import {EncryptedUser, User} from '../models/user-data.model';
import {decryptUser, getCryptoKey} from '../utils/crypto';
import {SubsContainer} from '../utils/subs-container';
import {AngularFirebaseAuthService} from './angular-firebase-auth.service';
import {docSnapshots} from './firebase/firestore';
import {FunctionsService} from './firebase/functions.service';

@Injectable()
export class AuthService {

  user$ = new BehaviorSubject<User | null | undefined>(undefined);
  userDocSub: Subscription | undefined;
  whileLoginIn = signal(false);
  onSnapshotSubs = new SubsContainer();
  wasUserCreatedWithEmailAndPassword = signal(false);

  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    private angularFirebaseAuthService: AngularFirebaseAuthService,
    @Inject(FirestoreInjectionToken) private readonly firestore: Firestore,
    private readonly functionsService: FunctionsService
  ) {
    this.angularFirebaseAuthService.firebaseUser$.subscribe(async (firebaseUser) => {

      if (firebaseUser && !(this.user$.value && this.user$.value?.firebaseUser.uid !== firebaseUser.uid)) {

        if (this.whileLoginIn()) {
          return;
        }

        if (this.wasUserCreatedWithEmailAndPassword()) {
          this.wasUserCreatedWithEmailAndPassword.set(false);
          this.signOut().subscribe();
          return;
        }

        const isAnonymous = firebaseUser.isAnonymous || !firebaseUser.providerData.length;

        if (!isAnonymous && !firebaseUser.emailVerified) {
          this.snackBar.open('Please verify your email 🤫 and try again 🙂');
          this.signOut().subscribe();
          return;
        }

        if (!this.user$.value) {
          this.whileLoginIn.set(true);
        }

        from(getIdTokenResult(firebaseUser, true).then((idTokenResult) => {
          if (!idTokenResult.claims['encryptedSymmetricKey']) {
            throw new Error('without/encrypted-symmetric-key');
          }
          return idTokenResult;
        })).pipe(
          retry({count: 10, delay: 2000}),
          switchMap((idTokenResult) => {
            if (!idTokenResult.claims['secretKey']) {
              return this.functionsService.httpsCallable<null, {customToken: string}>('authGetTokenWithSecretKeyUrl', null).pipe(
                mergeMap((res) => {
                  return this.angularFirebaseAuthService.signInWithCustomToken(res.customToken);
                }),
                mergeMap((userCredential) => {
                  return zip(
                    getIdTokenResult(userCredential.user, true),
                    of(userCredential.user)
                  );
                })
              )
            }

            return zip(of(idTokenResult), of(firebaseUser));
          }),
          catchError(() => {
            this.angularFirebaseAuthService.signOut().subscribe();
            return NEVER;
          }),
        ).subscribe(async ([idTokenResult, firebaseUser]) => {

          const cryptoKey = await getCryptoKey(idTokenResult.claims['secretKey'] as string);

          const newUser: User = {
            cryptoKey,
            photoURL: firebaseUser.photoURL as string,
            hasCustomPhoto: false,
            firebaseUser,
            rounds: []
          };

          if (idTokenResult.claims['isAnonymous']) {
            newUser.isAnonymous = true;
            newUser.providerId = 'Anonymous';
          } else {
            newUser.isAnonymous = firebaseUser.isAnonymous;
            newUser.providerId = firebaseUser.providerData[0].providerId;
          }

          this.unsubscribeUserDocSub();

          // EncryptedUser
          const userRef = doc(this.firestore, `users/${firebaseUser.uid}`)

          this.userDocSub = docSnapshots(userRef).pipe(
            catchError((error) => {
              if (error.code === 'permission-denied') {
                this.signOut().subscribe();
              }
              throw error;
            })
          ).pipe(
            switchMap((docSnapEncryptedUser) => {

              const data = docSnapEncryptedUser.data() as EncryptedUser;

              return decryptUser({
                rounds: data.rounds,
                photoURL: data.photoURL,
                hasEncryptedSecretKey: data.hasEncryptedSecretKey
              }, newUser.cryptoKey as CryptoKey)
            })
          ).subscribe((decryptedUser) => {

            if (decryptedUser.rounds) {
              newUser.rounds = decryptedUser.rounds;
            }

            if (decryptedUser.photoURL) {
              newUser.photoURL = decryptedUser.photoURL;
              newUser.hasCustomPhoto = true;
            } else {
              newUser.photoURL = firebaseUser.photoURL;
              newUser.hasCustomPhoto = false;
            }

            this.user$.next(newUser);

            if (this.router.routerState.snapshot.url === '/') {
              this.router.navigate(['/', RouterDict.user]).then(() => {
                this.whileLoginIn.set(false);
              });
            } else {
              this.whileLoginIn.set(false);
            }
          });
        });

      } else {
        this.unsubscribeAllUserSubs();
        this.user$.next(null);
        this.whileLoginIn.set(false);
        this.router.navigate(['/']);
        this.wasUserCreatedWithEmailAndPassword.set(false);
      }
    });
  }

  googleSignIn(): Observable<void> {

    return defer(() => {
      this.whileLoginIn.set(true);
      return this.angularFirebaseAuthService.signInWithRedirect(new GoogleAuthProvider()).pipe(
        catchError((e) => {
          this.whileLoginIn.set(false);
          throw e;
        })
      );
    });
  }

  anonymouslySignIn(): Observable<UserCredential> {
    return this.angularFirebaseAuthService.signInAnonymously();
  }

  signInWithEmailAndPassword(email: string, password: string): Observable<UserCredential | void> {
    return this.angularFirebaseAuthService.signInWithEmailAndPassword(email, password);
  }

  createUserWithEmailAndPassword(email: string, password: string): Observable<{code: string, message: string}> {

    return defer(() => {
      this.wasUserCreatedWithEmailAndPassword.set(true);

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
    });
  }

  sendEmailVerification(user: FirebaseUser): Observable<void> {
    return this.angularFirebaseAuthService.sendEmailVerification(user);
  }

  sendPasswordResetEmail(email: string): Observable<void> {
    return this.angularFirebaseAuthService.sendPasswordResetEmail(email);
  }

  updatePassword(newPassword: string): Observable<{code: string; message: string;}> {

    return defer(() => {
      const user = this.user$.value;

      // was created by email password
      if (!user || user.firebaseUser?.providerData[0]?.providerId !== 'password') {

        return throwError(() => {
          return {
            code: 'auth/unauthorized',
            message: `Password hasn't been updated 🤫`
          }
        });
      }

      return this.angularFirebaseAuthService.updatePassword(user.firebaseUser, newPassword);
    });
  }

  signOut(): Observable<void> {
    return this.angularFirebaseAuthService.signOut();
  }

  deleteUser(): Observable<void> {
    return this.angularFirebaseAuthService.deleteUser();
  }

  uploadProfileImage(file: File): Observable<{message: string}> {

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

    return from(
      new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.addEventListener('loadend', function () {
          resolve(reader.result as string);
        }, false);
      })
    ).pipe(
      mergeMap((imageDataURL) => {
        return this.functionsService.httpsCallable<{imageDataURL: string}, {
          message: string
        }>('userUploadProfileImageUrl', {imageDataURL});
      })
    );
  }

  removePhoto(): Observable<void> {

    return defer(() => {
      const user = this.user$.value as User;

      const userRef = doc(this.firestore, `users/${user?.firebaseUser?.uid}`);

      return updateDoc(userRef, {
        photoURL: deleteField()
      });
    });
  }

  unsubscribeUserDocSub(): void {
    if (this.userDocSub && !this.userDocSub.closed) {
      this.userDocSub.unsubscribe();
    }
  }

  unsubscribeAllUserSubs(): void {
    this.onSnapshotSubs.clear();
    this.unsubscribeUserDocSub();
  }
}
