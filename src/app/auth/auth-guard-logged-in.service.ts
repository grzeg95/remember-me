import {Injectable} from '@angular/core';
import {CanActivate, Router, UrlTree} from '@angular/router';
import {AngularFirebaseAuthService} from 'angular-firebase';
import {Observable} from 'rxjs';
import {map, take} from 'rxjs/operators';
import {RouterDict} from '../app.constants';

@Injectable()
export class AuthGuardLoggedIn implements CanActivate {

  constructor(
    private router: Router,
    private angularFirebaseAuthService: AngularFirebaseAuthService,
  ) {
  }

  canActivate(): Observable<true | UrlTree> {
    return this.angularFirebaseAuthService.user().pipe(
      take(1),
      map(user => !!user),
      map((can: boolean) => {

        // redirect to default user view
        if (can) {
          return this.router.createUrlTree(['/', RouterDict.user, RouterDict.rounds, RouterDict.roundsList]);
        }
        return true;
      })
    );
  }
}
