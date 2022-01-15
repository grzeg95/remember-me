import {Injectable} from '@angular/core';
import {AngularFireAnalytics} from '@angular/fire/compat/analytics';
import {ActivatedRouteSnapshot, CanActivate} from '@angular/router';

@Injectable()
export class ExtraParametersGuard implements CanActivate {

    constructor(
        private analytics: AngularFireAnalytics
    ) {}

    canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {

        const queryParams = {...route.queryParams};
        const promises = [];

        for (const queryParam of Object.getOwnPropertyNames(queryParams)) {
          promises.push(this.analytics.logEvent('entered via ref link', {[queryParam]: queryParams[queryParam]}));
        }

        return Promise.all(promises).then(() => true).catch(() => true);
    }
}
