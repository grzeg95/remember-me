import {Injectable} from '@angular/core';
import {
  CanActivate,
  Router
} from '@angular/router';
import {User} from 'firebase';
import {Observable} from 'rxjs';
import {map, take, tap} from 'rxjs/operators';
import {RouterDict} from '../app.constants';
import {AuthService} from './auth.service';

@Injectable()
export class AuthGuardGuestService implements CanActivate {

  constructor(private auth: AuthService,
              private router: Router) {}

  canActivate(): Observable<boolean> {

    return this.auth.user$.pipe(
      take(1),
      map((authState: User | null) => !!!authState),
      tap((notAuthenticated) => {
        if (notAuthenticated) {
          return true;
        }
        this.router.navigate(['/' + RouterDict['user'] + '/' + RouterDict['today']]);
      }));

  }

}
