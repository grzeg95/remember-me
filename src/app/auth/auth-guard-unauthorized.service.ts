import {inject} from '@angular/core';
import {Router, UrlTree} from '@angular/router';
import {AngularFirebaseAuthService} from 'angular-firebase';
import {Observable} from 'rxjs';
import {map, take} from 'rxjs/operators';

export const authGuardUnauthorized = (): Observable<true | UrlTree> => {

  const router = inject(Router);
  const angularFirebaseAuthService = inject(AngularFirebaseAuthService);

  return angularFirebaseAuthService.user().pipe(
    take(1),
    map(user => !!user),
    map((can: boolean) => {

      // redirect to guest view
      if (!can) {
        return router.createUrlTree(['/']);
      }
      return true;
    })
  );
}
