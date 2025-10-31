import {inject} from '@angular/core';
import {Router, UrlTree} from '@angular/router';
import {Observable} from 'rxjs';
import {filter, map, take} from 'rxjs/operators';
import {RouterDict} from '../models/router-dict';
import {Auth} from './auth';

export const authGuardLoggedIn = (): Observable<true | UrlTree> => {

  const router = inject(Router);
  const auth = inject(Auth);

  return auth.authUser$.pipe(
    filter((authUser) => authUser !== undefined),
    take(1),
    map((authUser) => !!authUser),
    map((can: boolean) => {

      // redirect to the default user view
      if (can) {
        return router.createUrlTree(['/', RouterDict.rounds]);
      }
      return true;
    })
  );
}
