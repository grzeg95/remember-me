import { Injectable } from '@angular/core';
import {
  ActivatedRoute,
  CanActivate,
  CanActivateChild,
  Router
} from '@angular/router';
import firebase from 'firebase/app';
import {Observable} from 'rxjs';
import {map, take, tap} from 'rxjs/operators';
import {AuthService} from './auth.service';

@Injectable()
export class AuthGuardUserService implements CanActivate, CanActivateChild {

  constructor(private authService: AuthService,
              private router: Router,
              private activatedRoute: ActivatedRoute) {}

  canActivate(): Observable<boolean>  {
    return this.authService.firebaseUser$.pipe(
      take(1),
      map((authState: firebase.User) => !!authState),
      tap((authenticated) => {
        if (!authenticated) {
          this.router.navigate(['../'], {relativeTo: this.activatedRoute});
        }
      }));
  }

  canActivateChild(): Observable<boolean> {
    return this.canActivate();
  }

}
