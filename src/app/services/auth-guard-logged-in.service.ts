import {inject} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {Router, UrlTree} from '@angular/router';
import {combineLatest, Observable} from 'rxjs';
import {filter, map, take} from 'rxjs/operators';
import {RouterDict} from '../app.constants';
import {AuthService} from './auth.service';

export const authGuardLoggedIn = (): Observable<true | UrlTree> => {

  const router = inject(Router);
  const authService = inject(AuthService);

  return combineLatest([
    toObservable(authService.userSig.get()),
    toObservable(authService.authStateReady)
  ]).pipe(
    filter(([user, authStateReady]) => user !== undefined && !!authStateReady),
    take(1),
    map(([user, authStateReady]) => !!user),
    map((can: boolean) => {

      // redirect to default user view
      if (can) {
        return router.createUrlTree(['/', RouterDict.user]);
      }
      return true;
    })
  );
}
