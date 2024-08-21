import {inject} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {Router, UrlTree} from '@angular/router';
import {combineLatest, map, Observable, skip, take, tap} from 'rxjs';
import {filter} from 'rxjs/operators';
import {AuthService} from './auth.service';

export const authGuardUnauthorized = (): Observable<true | UrlTree> => {

  const router = inject(Router);
  const authService = inject(AuthService);

  return combineLatest([
    toObservable(authService.userSig.get()),
    toObservable(authService.authStateReady)
  ]).pipe(
    filter(([user, authStateReady]) => user !== undefined && authStateReady !== undefined),
    take(1),
    map(([user, authStateReady]) => !!user),
    map((can: boolean) => {

      // redirect to guest view
      if (!can) {
        return router.createUrlTree(['/']);
      }
      return true;
    })
  );
}
