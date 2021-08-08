import {Injectable} from '@angular/core';
import {
  CanActivate,
  Router,
  UrlTree
} from '@angular/router';
import firebase from 'firebase/app';
import {Observable} from 'rxjs';
import {map, take} from 'rxjs/operators';
import {RouterDict} from '../app.constants';
import {AuthService} from './auth.service';

@Injectable()
export class AuthGuardGuestService implements CanActivate {

  constructor(private auth: AuthService,
              private router: Router) {}

  canActivate(): Observable<boolean | UrlTree>  {
    return this.auth.firebaseUser$.pipe(
      take(1),
      map((authState: firebase.User) => {

        // not authenticated
        if (!!!authState) {
          return true;
        }

        return this.router.createUrlTree(['/', RouterDict.user, RouterDict.today]);
      }));
  }

}
