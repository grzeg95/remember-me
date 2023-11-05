import {inject} from '@angular/core';
import {Router, UrlTree} from '@angular/router';
import {Observable} from 'rxjs';
import {filter, map, take} from 'rxjs/operators';
import {RouterDict} from '../app.constants';
import {AuthService} from './auth.service';

export const authGuardLoggedIn = (): Observable<true | UrlTree> => {

  const router = inject(Router);
  const authService = inject(AuthService);

  return authService.user$.pipe(
    filter((user) => user !== undefined),
    take(1),
    map(user => !!user),
    map((can: boolean) => {

      // redirect to default user view
      if (can) {
        return router.createUrlTree(['/', RouterDict.user, RouterDict.rounds, RouterDict.roundsList]);
      }
      return true;
    })
  );
}
