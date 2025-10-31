import {inject} from '@angular/core';
import {Router, UrlTree} from '@angular/router';
import {map, Observable, take} from 'rxjs';
import {filter} from 'rxjs/operators';
import {Auth} from './auth';

export const authGuardUnauthorized = (): Observable<true | UrlTree> => {

  const router = inject(Router);
  const auth = inject(Auth);

  return auth.authUser$.pipe(
    filter((authUser) => authUser !== undefined),
    take(1),
    map((authUser) => !!authUser),
    map((can: boolean) => {

      // redirect to guest view
      if (!can) {
        return router.createUrlTree(['/']);
      }
      return true;
    })
  );
}
