import {Inject, Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate} from '@angular/router';
import {Analytics, logEvent} from 'firebase/analytics';
import {ANALYTICS} from './injectors';

@Injectable()
export class ExtraParametersRoutePipe implements CanActivate {

  constructor(
    @Inject(ANALYTICS) private readonly analytics: Analytics
  ) {
  }

  canActivate(route: ActivatedRouteSnapshot): boolean {

    const usefulQueryParams = new Set(['fbclid']);
    const queryParams = {...route.queryParams};

    for (const queryParam of Object.getOwnPropertyNames(queryParams)) {
      if (usefulQueryParams.has(queryParam)) {
        logEvent(this.analytics, 'entered via ref link', {[queryParam]: queryParams[queryParam]});
      } else {
        logEvent(this.analytics, 'entered via unknown ref link', {[queryParam]: queryParams[queryParam]});
      }
    }

    return true;
  }
}
