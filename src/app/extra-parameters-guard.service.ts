import {Inject, Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate} from '@angular/router';
import {Analytics, logEvent} from 'firebase/analytics';

@Injectable()
export class ExtraParametersGuard implements CanActivate {

    constructor(
      @Inject('ANALYTICS') private readonly analytics: Analytics
    ) {}

    canActivate(route: ActivatedRouteSnapshot): boolean {

        const queryParams = {...route.queryParams};

        for (const queryParam of Object.getOwnPropertyNames(queryParams)) {
          logEvent(this.analytics, 'entered via ref link', {[queryParam]: queryParams[queryParam]});
        }

        return true;
    }
}
