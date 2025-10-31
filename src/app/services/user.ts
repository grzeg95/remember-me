import {inject, Injectable} from '@angular/core';
import {httpsCallable} from 'firebase/functions';
import {defer, from, switchMap, throwError} from 'rxjs';
import {FunctionsInjectionToken} from '../tokens/firebase';

@Injectable({
  providedIn: 'root'
})
export class User {

  private readonly _functions = inject(FunctionsInjectionToken);

  removePhoto() {
    return defer(() => httpsCallable<undefined, {details: string}>(this._functions, 'users-deleteuserimage')());
  }

  uploadProfileImage(file: File) {

    return defer(() => {

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
        switchMap((imageDataURL) => httpsCallable<{imageDataURL: string}, {details: string}>(this._functions, 'users-uploadprofileimage')({imageDataURL}))
      );
    });
  }
}
