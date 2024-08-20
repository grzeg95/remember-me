import {Inject, Injectable} from '@angular/core';
import {deleteField, doc, Firestore, updateDoc} from 'firebase/firestore';
import {defer, from, mergeMap, Observable, throwError} from 'rxjs';
import {FirestoreInjectionToken} from '../models/firebase';
import {AuthService} from './auth.service';
import {FunctionsService} from './functions.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private readonly _user = this._authService.userSig.get();

  constructor(
    private readonly _functionsService: FunctionsService,
    @Inject(FirestoreInjectionToken) private readonly _firestore: Firestore,
    private readonly _authService: AuthService,
  ) { }

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
        return this._functionsService.httpsCallable<{imageDataURL: string}, {
          message: string
        }>('user-uploadprofileimage', {imageDataURL});
      })
    );
  }

  removePhoto(): Observable<void> {

    return defer(() => {

      const user = this._user();

      if (!user) {
        return Promise.resolve();
      }

      const userRef = doc(this._firestore, `users/${user.id}`);

      return updateDoc(userRef, {
        photoURL: deleteField()
      });
    });
  }
}
