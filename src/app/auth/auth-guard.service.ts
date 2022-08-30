import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot} from '@angular/router';
import {map, take} from 'rxjs/operators';
import {AngularFirebaseAuthService} from 'angular-firebase';
import {AuthPipeGenerator, loggedIn} from './index';

@Injectable()
export class AuthGuard implements CanActivate {

  constructor(
    private router: Router,
    private angularFirebaseAuthService: AngularFirebaseAuthService,
  ) {
  }

  canActivate = (next: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const authPipeFactory = next.data.authGuardPipe as AuthPipeGenerator || (() => loggedIn);
    return this.angularFirebaseAuthService.user$().pipe(
      take(1),
      authPipeFactory(next, state),
      map((can) => {
        if (typeof can === 'boolean') {
          return can;
        } else if (Array.isArray(can)) {
          return this.router.createUrlTree(can);
        } else {
          return this.router.parseUrl(can as string);
        }
      })
    );
  }
}
