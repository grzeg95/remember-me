import { Injectable } from '@angular/core';
import {
  ActivatedRoute,
  ActivatedRouteSnapshot,
  CanActivate,
  CanActivateChild,
  Router,
  RouterStateSnapshot
} from '@angular/router';
import {User} from 'firebase';
import {Observable} from 'rxjs';
import {map, take, tap} from 'rxjs/operators';
import {AuthService} from './auth.service';

@Injectable()
export class AuthGuardUserService implements CanActivate, CanActivateChild {

  constructor(private authService: AuthService,
              private router: Router,
              private activatedRoute: ActivatedRoute) {}

  canActivate(route: ActivatedRouteSnapshot,
              state: RouterStateSnapshot): Observable<boolean>  {

    return this.authService.user$.pipe(
      take(1),
      map((authState: User | null) => !!authState),
      tap((authenticated) => {
        if (!authenticated) {
          this.router.navigate(['../'], {relativeTo: this.activatedRoute});
        }
      }));
  }

  canActivateChild(route: ActivatedRouteSnapshot,
                   state: RouterStateSnapshot): Observable<boolean> {
    return this.canActivate(route, state);
  }

}
