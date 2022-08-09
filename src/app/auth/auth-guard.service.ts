import {Inject, Injectable} from "@angular/core";
import {ActivatedRouteSnapshot, CanActivate, Router, UrlTree} from "@angular/router";
import {Auth} from "firebase/auth";

@Injectable()
export class AuthGuard implements CanActivate {

  constructor(
    private router: Router,
    @Inject('AUTH') private readonly auth: Auth
  ) {
  }

  canActivate(route: ActivatedRouteSnapshot): Promise<boolean | UrlTree> {

    return new Promise((resolve) => {
      const onAuthStateChangedUnsub = this.auth.onAuthStateChanged(async (firebaseUser) => {

        if (!firebaseUser && !route.data.redirectUnauthorizedTo) {
          onAuthStateChangedUnsub();
          resolve(true);
        }

        if (firebaseUser && !route.data.redirectLoggedInTo) {
          onAuthStateChangedUnsub();
          resolve(true);
        }

        if (firebaseUser && route.data.redirectLoggedInTo) {
          onAuthStateChangedUnsub();
          resolve(this.router.createUrlTree(route.data.redirectLoggedInTo));
        }

        if (!firebaseUser && route.data.redirectUnauthorizedTo) {
          onAuthStateChangedUnsub();
          resolve(this.router.createUrlTree(route.data.redirectUnauthorizedTo));
        }

        onAuthStateChangedUnsub();
      });
    });
  }
}
