import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Router} from '@angular/router';
import {
  AngularFirebaseAppCheckService,
  AngularFirebaseAuthService,
  AngularFirebaseFirestoreService,
  AngularFirebaseFunctionsService,
  AngularFirebaseRemoteConfigService
} from 'angular-firebase';
import {GoogleAuthProvider, IdTokenResult, UserCredential} from 'firebase/auth';
import {deleteField, DocumentData, DocumentSnapshot} from 'firebase/firestore';
import {
  BehaviorSubject,
  catchError,
  forkJoin,
  lastValueFrom,
  map,
  mergeMap,
  NEVER,
  Observable,
  Subscription,
  throwError
} from 'rxjs';
import {environment} from '../../environments/environment';
import {RouterDict} from '../app.constants';
import {SecurityService} from '../security.service';
import {EncryptedUser} from './index';
import {FirebaseUser, User} from './user-data.model';

@Injectable()
export class AuthService {

  user$: BehaviorSubject<User> = new BehaviorSubject<User>(undefined);
  firebaseUser$ = new BehaviorSubject<FirebaseUser>(undefined);
  userDocSub: Subscription;
  whileLoginIn$ = new BehaviorSubject<boolean>(false);
  isWaitingForCryptoKey$ = new BehaviorSubject<boolean>(false);
  onSnapshotSubs: Subscription[] = [];
  creatingUserWithEmailAndPassword = false;
  wasReloaded = false;
  wasTriedToLogInAMomentAgo = false;
  firstTimeOfPageLoading = true;
  userUpdatesWhileIsWaitingForCryptoKey: DocumentSnapshot<EncryptedUser>;

  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    private angularFirebaseAuthService: AngularFirebaseAuthService,
    private angularFirebaseFunctionService: AngularFirebaseFunctionsService,
    private angularFirebaseAppCheckService: AngularFirebaseAppCheckService,
    private angularFirebaseRemoteConfigService: AngularFirebaseRemoteConfigService,
    private angularFirebaseFirestoreService: AngularFirebaseFirestoreService,
    private securityService: SecurityService
  ) {
    this.init();
  }

  init() {

    this.angularFirebaseAuthService.beforeAuthStateChanged((firebaseUser) => {
      if (firebaseUser && !this.firstTimeOfPageLoading) {
        return lastValueFrom(this.angularFirebaseAuthService.reload$(firebaseUser, () => this.wasReloaded = true));
      }
      if (this.firstTimeOfPageLoading) {
        this.firstTimeOfPageLoading = false;
      }
    });

    this.angularFirebaseAuthService.user$().subscribe((firebaseUser) => {

      if (firebaseUser) {

        if (this.creatingUserWithEmailAndPassword) {
          this.creatingUserWithEmailAndPassword = false;
          this.signOut$().subscribe();
          return;
        }

        if (!crypto.subtle) {
          this.signOut$().subscribe();
          this.snackBar.open('Stop using IE lol');
          return;
        }

        if (this.wasReloaded && !this.wasTriedToLogInAMomentAgo) {
          this.wasReloaded = false;
          return;
        }

        if (this.wasTriedToLogInAMomentAgo) {
          this.wasTriedToLogInAMomentAgo = false;
        }

        const isAnonymous = firebaseUser.isAnonymous || !firebaseUser.providerData.length;

        // check if email was verified but not anonymous
        if (!isAnonymous && !firebaseUser.emailVerified) {
          this.snackBar.open('Please verify you email 🤫 and try again 🙂');
          this.signOut$().subscribe();
          return;
        }

        if (!this.firebaseUser$.value) {
          this.whileLoginIn$.next(true);
        }
        this.firebaseUser$.next(firebaseUser);
        this.unsubscribeUserDocSub();

        this.userDocSub = this.angularFirebaseFirestoreService.docOnSnapshot$<EncryptedUser>(`users/${firebaseUser.uid}`).pipe(catchError((error) => {
          if (error.code === 'permission-denied') {
            this.signOut$().subscribe();
          }
          throw error;
        })).subscribe((snap) => {

          // check if user has crypto key
          // decrypt
          // return
          const user = this.user$.value
          const cryptoKey = user?.cryptoKey;
          const isWaitingForCryptoKey = this.isWaitingForCryptoKey$.value;

          if (cryptoKey) {

            const firebaseUser = this.firebaseUser$.value;

            this.securityService.decryptUser({
              rounds: snap.data()?.rounds,
              photoUrl: snap.data()?.photoUrl,
              hasEncryptedSecretKey: snap.data()?.hasEncryptedSecretKey
            }, cryptoKey).subscribe((decryptedUser) => {

              if (decryptedUser.rounds) {
                user.rounds = decryptedUser.rounds;
              }

              if (decryptedUser.photoUrl) {
                user.photoURL = decryptedUser.photoUrl;
                user.hasCustomPhoto = true;
              } else {
                user.photoURL = firebaseUser.photoURL;
                user.hasCustomPhoto = false;
              }

              this.user$.next(user);
            });

            return;
          }

          // check if user has encrypted key
          if (snap.data()?.hasEncryptedSecretKey && !isWaitingForCryptoKey) {
            this.isWaitingForCryptoKey$.next(true);
            this.proceedGettingOfCryptoKey(this.firebaseUser$.value, snap);
          }

          if (isWaitingForCryptoKey) {
            this.userUpdatesWhileIsWaitingForCryptoKey = snap;
          }
        });

      } else {
        this.unsubscribeAllUserSubs();

        this.isWaitingForCryptoKey$.next(false);
        this.user$.next(null);
        this.firebaseUser$.next(null);
        this.whileLoginIn$.next(false);
        this.router.navigate(['/']);

        this.creatingUserWithEmailAndPassword = false;
        this.wasReloaded = false;
        this.wasTriedToLogInAMomentAgo = false;
        this.firstTimeOfPageLoading = false;
      }
    });
  }

  proceedGettingOfCryptoKey(firebaseUser: FirebaseUser, actionUserDocSnap?): void {
    this.getSecretKey$(firebaseUser).pipe(catchError((error) => {
      if (error && error.code === 'email-not-verified') {
        this.snackBar.open('Please verify you email 🤫 and try again 🙂');
      }
      this.signOut$().subscribe();
      throw NEVER;
    })).subscribe(({cryptoKey, firebaseUser, idTokenResult}) => {
      return this.userPostAction$(cryptoKey, firebaseUser, idTokenResult, actionUserDocSnap).subscribe();
    });
  }

  getSecretKey$(currentFirebaseUser: FirebaseUser): Observable<{firebaseUser: FirebaseUser, cryptoKey: CryptoKey, idTokenResult: IdTokenResult}> {

    return this.angularFirebaseAuthService.getIdTokenResult$(currentFirebaseUser, true).pipe(
      mergeMap((idTokenResult) => {

        if (!idTokenResult.claims.secretKey) {

          let firebaseUser: FirebaseUser;

          return this.getTokenWithSecretKey$().pipe(
            mergeMap((idTokenResult) => this.angularFirebaseAuthService.signInWithCustomToken$(idTokenResult)),
            mergeMap((userCredential) => {
              firebaseUser = userCredential.user;
              return this.angularFirebaseAuthService.getIdTokenResult$(firebaseUser, true);
            }),
            mergeMap((newIdTokenResult) => {
              return this.securityService.getCryptoKey$(newIdTokenResult.claims.secretKey as string).pipe(map((cryptoKey) => {
                return {
                  idTokenResult: newIdTokenResult,
                  cryptoKey,
                  firebaseUser
                }
              }))
            })
          );
        }

        return this.securityService.getCryptoKey$(idTokenResult.claims.secretKey as string).pipe(map((cryptoKey) => {
          return {
            idTokenResult,
            cryptoKey,
            firebaseUser: currentFirebaseUser
          }
        }));
      })
    );
  }

  getTokenWithSecretKey$(): Observable<string> {

    const getTokenWithSecretKeyUrl = this.angularFirebaseRemoteConfigService.getString('getTokenWithSecretKeyUrl');
    let httpsCallableFunction = this.angularFirebaseFunctionService.httpsCallable<undefined, string>('auth-getTokenWithSecretKey');

    if (getTokenWithSecretKeyUrl) {
      httpsCallableFunction = this.angularFirebaseFunctionService.httpsCallableFromURL<undefined, string>(getTokenWithSecretKeyUrl);
    }

    return httpsCallableFunction();
  }

  userPostAction$(cryptoKey: CryptoKey, firebaseUser: FirebaseUser, idTokenResult: IdTokenResult, actionUserDocSnap: DocumentSnapshot<DocumentData>): Observable<void> {

    const user: User = {
      cryptoKey,
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      emailVerified: firebaseUser.emailVerified,
      photoURL: firebaseUser.photoURL,
      hasCustomPhoto: false
    };

    if (idTokenResult.claims.isAnonymous) {
      user.isAnonymous = true;
      user.providerId = 'Anonymous';
    } else {
      user.isAnonymous = firebaseUser.isAnonymous;
      user.providerId = firebaseUser.providerData[0].providerId;
    }

    let snap = actionUserDocSnap;

    if (this.userUpdatesWhileIsWaitingForCryptoKey) {
      snap = this.userUpdatesWhileIsWaitingForCryptoKey;
    }

    return this.securityService.decryptUser({
      rounds: snap.data()?.rounds,
      photoUrl: snap.data()?.photoUrl,
      hasEncryptedSecretKey: snap.data()?.hasEncryptedSecretKey
    }, cryptoKey).pipe(map((decryptedUser) => {

      if (decryptedUser.rounds) {
        user.rounds = decryptedUser.rounds;
      }

      if (decryptedUser.photoUrl) {
        user.photoURL = decryptedUser.photoUrl;
        user.hasCustomPhoto = true;
      }

      this.isWaitingForCryptoKey$.next(false);
      this.firebaseUser$.next(firebaseUser);
      this.user$.next(user);

      if (this.router.routerState.snapshot.url === '/') {
        this.router.navigate(['/', RouterDict.user, RouterDict.rounds, RouterDict.roundsList]).then(() => {
          this.whileLoginIn$.next(false);
        });
      } else {
        this.whileLoginIn$.next(false);
      }
    }));
  }

  googleSignIn$(): Observable<void> {

    // is not logged in
    if (!this.user$.value) {
      this.whileLoginIn$.next(true);

      return this.angularFirebaseAuthService.signInWithRedirect$(new GoogleAuthProvider()).pipe(catchError((e) => {
        this.whileLoginIn$.next(false);
        throw e;
      }));
    }

    return throwError(() => {
    });
  }

  anonymouslySignIn$(): Observable<UserCredential | void> {

    // is not logged in
    if (!this.user$.value) {
      this.whileLoginIn$.next(true);
      this.wasTriedToLogInAMomentAgo = true;

      return this.angularFirebaseAuthService.signInAnonymously$().pipe(catchError((e) => {
        this.whileLoginIn$.next(false);
        throw e;
      }));
    }

    return throwError(() => {
    });
  }

  signInWithEmailAndPassword$(email: string, password: string): Observable<UserCredential | void> {

    // is not logged in
    if (!this.user$.value) {
      this.whileLoginIn$.next(true);
      this.wasTriedToLogInAMomentAgo = true;

      return this.angularFirebaseAuthService.signInWithEmailAndPassword$(email, password).pipe(catchError((e) => {
        this.whileLoginIn$.next(false);
        throw e;
      }));
    }

    return throwError(() => {
    });
  }

  createUserWithEmailAndPassword$(email: string, password: string): Observable<{code: string, message: string}> {

    // is not logged in
    if (!this.user$.value) {
      this.creatingUserWithEmailAndPassword = true;

      return this.angularFirebaseAuthService.createUserWithEmailAndPassword$(email, password).pipe(
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
          return this.angularFirebaseAuthService.sendEmailVerification$(userCredential.user).pipe(
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

  sendEmailVerification$(user: FirebaseUser): Observable<void> {

    // is not logged in
    if (!this.user$.value) {
      return this.angularFirebaseAuthService.sendEmailVerification$(user);
    }

    return throwError(() => {
    });
  }

  sendPasswordResetEmail$(email: string): Observable<void> {

    // is not logged in
    if (!this.user$.value) {
      return this.angularFirebaseAuthService.sendPasswordResetEmail$(email);
    }

    return throwError(() => {
    });
  }

  updatePassword$(newPassword: string): Observable<{code: string; message: string;}> {

    // is not logged in
    // was created by email password

    const firebaseUser = this.firebaseUser$.value;

    if (!this.user$.value && !firebaseUser && firebaseUser.providerData[0]?.providerId !== 'password') {

      return throwError(() => {
        return {
          code: 'auth/unauthorized',
          message: `Password hasn't been updated 🤫`
        }
      });
    }

    return this.angularFirebaseAuthService.updatePassword$(firebaseUser, newPassword);
  }

  signOut$(): Observable<void> {
    return this.angularFirebaseAuthService.signOut$();
  }

  deleteUser$(): Observable<void> {

    // is logged in
    if (this.user$.value) {
      const firebaseUser = this.firebaseUser$.value;
      return this.angularFirebaseAuthService.deleteUser$(firebaseUser);
    }

    return throwError(() => {
    });
  }

  uploadProfileImage$(file: File): Observable<{message: string}> {

    // is logged in
    if (this.user$.value) {

      const firebaseUser = this.firebaseUser$.value;

      return forkJoin([
        this.angularFirebaseAuthService.getIdToken$(firebaseUser),
        this.angularFirebaseAppCheckService.getToken$()
      ]).pipe(
        mergeMap(([userToken, xFirebaseAppCheckToken]) => {
          let url: string = '';

          if (!environment.production) {
            url = `${environment.emulators.functions.protocol}://${environment.emulators.functions.host}:${environment.emulators.functions.port}/${environment.firebase.projectId}/europe-west4/userv2-uploadprofileimage`;
          }

          if (environment.production) {
            url = 'https://userv2-uploadprofileimage-yhy2fc7udq-ez.a.run.app';
          }

          const uploadProfileImageUrl = this.angularFirebaseRemoteConfigService.getString('uploadProfileImageUrl');
          if (uploadProfileImageUrl) {
            url = uploadProfileImageUrl;
          }

          const headers = {
            'Content-Type': file.type,
            'authorization': `Bearer ${userToken}`,
            'X-Firebase-AppCheck': xFirebaseAppCheckToken
          };

          return lastValueFrom(
            this.http.post<{message: string}>(url, file, {headers})
          );
        })
      )
    }

    return throwError(() => {
    });
  }

  removePhoto$(): Observable<void> {

    // is logged in
    if (this.user$.value) {
      const firebaseUser = this.firebaseUser$.value;
      return this.angularFirebaseFirestoreService.updateDoc$(`users/${firebaseUser.uid}`, {
        photoUrl: deleteField()
      });
    }

    return throwError(() => {
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
