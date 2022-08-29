import {ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import {Auth, onAuthStateChanged, onIdTokenChanged} from 'firebase/auth';
import {map, Observable, pipe, UnaryFunction} from 'rxjs';
import {FirebaseUser} from './user-data.model';

export {AuthService} from './auth.service';
export {AuthGuard} from './auth-guard.service';
export * from './user-data.model';
export * from './auth-form';

export type AuthPipeGenerator = (next: ActivatedRouteSnapshot, state: RouterStateSnapshot) => AuthPipe;
export type AuthPipe = UnaryFunction<Observable<FirebaseUser | null>, Observable<boolean | string | any[]>>;

export const loggedIn: AuthPipe = map(user => !!user);

export const user$ = (auth: Auth): Observable<FirebaseUser | null> => {
  return new Observable((subscriber) => {
    const unsubscribe = onIdTokenChanged(auth,
      subscriber.next.bind(subscriber),
      subscriber.error.bind(subscriber),
      subscriber.complete.bind(subscriber)
    );
    return {unsubscribe};
  });
}

export const onAuthStateChanged$ = (auth: Auth): Observable<FirebaseUser | null> => {
  return new Observable((subscriber) => {
    const unsubscribe = onAuthStateChanged(auth,
      subscriber.next.bind(subscriber),
      subscriber.error.bind(subscriber),
      subscriber.complete.bind(subscriber)
    );
    return {unsubscribe};
  });
};

export const redirectLoggedInTo: (redirect: string | any[]) => AuthPipe =
  (redirect) => pipe(loggedIn, map(loggedIn => loggedIn && redirect || true));

export const redirectUnauthorizedTo: (redirect: string | any[]) => AuthPipe =
  (redirect) => pipe(loggedIn, map(loggedIn => loggedIn || redirect));
