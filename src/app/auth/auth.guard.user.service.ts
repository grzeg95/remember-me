import { Injectable } from '@angular/core';
import {
  ActivatedRoute,
  CanActivate,
  CanActivateChild,
  Router,
  UrlTree
} from '@angular/router';
import firebase from 'firebase/app';
import {Observable} from 'rxjs';
import {map, take} from 'rxjs/operators';
import {AuthService} from './auth.service';

@Injectable()
export class AuthGuardUserService implements CanActivate, CanActivateChild {

  constructor(private authService: AuthService,
              private router: Router,
              private activatedRoute: ActivatedRoute) {}

  canActivate(): Observable<boolean | UrlTree>  {
    return this.authService.firebaseUser$.pipe(
      take(1),
      map((authState: firebase.User) => {

        // not authenticated
        if (!!!authState) {
          return this.router.createUrlTree(['../'], {relativeTo: this.activatedRoute});
        }
        
        return true;
      }));
  }

  canActivateChild(): Observable<boolean | UrlTree> {
    return this.canActivate();
  }
}
