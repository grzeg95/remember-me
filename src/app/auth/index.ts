import {ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import {map, Observable, pipe, UnaryFunction} from 'rxjs';
import {FirebaseUser} from './user-data.model';

export {AuthService} from './auth.service';
export {AuthGuard} from './auth-guard.service';
export * from './user-data.model';
export * from './auth-form';

export type AuthPipeGenerator = (next: ActivatedRouteSnapshot, state: RouterStateSnapshot) => AuthPipe;
export type AuthPipe = UnaryFunction<Observable<FirebaseUser | null>, Observable<boolean | string | any[]>>;

export const loggedIn: AuthPipe = map(user => !!user);

export const redirectLoggedInTo: (redirect: string | any[]) => AuthPipe =
  (redirect) => pipe(loggedIn, map(loggedIn => loggedIn && redirect || true));

export const redirectUnauthorizedTo: (redirect: string | any[]) => AuthPipe =
  (redirect) => pipe(loggedIn, map(loggedIn => loggedIn || redirect));
