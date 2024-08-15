import {inject} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {Router, UrlTree} from '@angular/router';
import {map, Observable, take} from 'rxjs';
import {filter} from 'rxjs/operators';
import {AuthService} from './auth.service';

export const authGuardUnauthorized = (): Observable<true | UrlTree> => {

  const router = inject(Router);
  const authService = inject(AuthService);

  return toObservable(authService.userSig.get()).pipe(
    filter((user) => user !== undefined),
    take(1),
    map(user => !!user),
    map((can: boolean) => {

      console.log(can);

      // redirect to guest view
      if (!can) {
        return router.createUrlTree(['/']);
      }
      return true;
    })
  );
}
