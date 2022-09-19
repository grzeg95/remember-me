import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate} from '@angular/router';
import {AngularFirebaseAnalyticsService} from 'angular-firebase';

@Injectable()
export class ExtraParametersRoutePipe implements CanActivate {

  constructor(
    private angularFirebaseAnalyticsService: AngularFirebaseAnalyticsService
  ) {
  }

  canActivate(route: ActivatedRouteSnapshot): boolean {

    const usefulQueryParams = new Set(['fbclid']);
    const queryParams = {...route.queryParams};

    for (const queryParam of Object.getOwnPropertyNames(queryParams)) {
      if (usefulQueryParams.has(queryParam)) {
        this.angularFirebaseAnalyticsService.logEvent('entered_via_ref_link', {[queryParam]: queryParams[queryParam]});
      } else {
        this.angularFirebaseAnalyticsService.logEvent('entered_via_unknown_ref_link', {[queryParam]: queryParams[queryParam]});
      }
    }

    return true;
  }
}
