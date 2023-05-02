import {inject} from '@angular/core';
import {Router, UrlTree} from '@angular/router';
import {AngularFirebaseAuthService} from 'angular-firebase';
import {Observable} from 'rxjs';
import {map, take} from 'rxjs/operators';
import {RouterDict} from '../app.constants';

export const authGuardLoggedIn = (): Observable<true | UrlTree> => {

  const router = inject(Router);
  const angularFirebaseAuthService = inject(AngularFirebaseAuthService);

  return angularFirebaseAuthService.user().pipe(
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
