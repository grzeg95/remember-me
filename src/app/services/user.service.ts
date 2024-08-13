import {Inject, Injectable} from '@angular/core';
import {Auth} from 'firebase/auth';
import {deleteField, Firestore, updateDoc} from 'firebase/firestore';
import {defer, from, Observable, switchMap, throwError} from 'rxjs';
import {AuthInjectionToken, FirestoreInjectionToken} from '../models/firebase';
import {User} from '../models/user';
import {FunctionsService} from './functions.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(
    private readonly _functionsService: FunctionsService,
    @Inject(AuthInjectionToken) private readonly _auth: Auth,
    @Inject(FirestoreInjectionToken) private readonly _firestore: Firestore
  ) {
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
      switchMap((imageDataURL) => this._functionsService.httpsCallable<{imageDataURL: string}, {
        message: string
      }>('userUploadProfileImageUrl', {imageDataURL}))
    );
  }

  removePhoto(): Observable<void> {

    return defer(() => {

      const user = this._auth.currentUser;

      if (!user) {
        throw 'There is no user';
      }

      const userRef = User.ref(this._firestore, user.uid);

      return defer(() => updateDoc(userRef, {
        photoURL: deleteField()
      }));
    });
  }
}
