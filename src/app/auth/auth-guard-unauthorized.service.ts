import {Injectable} from '@angular/core';
import {CanActivate, Router, UrlTree} from '@angular/router';
import {AngularFirebaseAuthService} from 'angular-firebase';
import {Observable} from 'rxjs';
import {map, take} from 'rxjs/operators';

@Injectable()
export class AuthGuardUnauthorized implements CanActivate {

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

        // redirect to guest view
        if (!can) {
          return this.router.createUrlTree(['/']);
        }
        return true;
      })
    );
  }
}
