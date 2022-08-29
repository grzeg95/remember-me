import {Inject, Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot} from '@angular/router';
import {Auth} from 'firebase/auth';
import {map, take} from 'rxjs/operators';
import {AUTH} from '../injectors';
import {AuthPipeGenerator, loggedIn, user$} from './index';

@Injectable()
export class AuthGuard implements CanActivate {

  constructor(
    private router: Router,
    @Inject(AUTH) private readonly auth: Auth
  ) {
  }

  canActivate = (next: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const authPipeFactory = next.data.authGuardPipe as AuthPipeGenerator || (() => loggedIn);
    return user$(this.auth).pipe(
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
