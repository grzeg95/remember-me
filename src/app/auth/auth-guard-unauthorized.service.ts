import {inject} from '@angular/core';
import {Router, UrlTree} from '@angular/router';
import {Observable} from 'rxjs';
import {filter, map, take} from 'rxjs/operators';
import {AuthService} from './auth.service';

export const authGuardUnauthorized = (): Observable<true | UrlTree> => {

  const router = inject(Router);
  const authService = inject(AuthService);

  return authService.user$.pipe(
    filter((user) => user !== undefined),
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
