import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate} from '@angular/router';
import {GoogleAnalyticsService} from './google-analytics.service';

@Injectable()
export class ExtraParametersGuard implements CanActivate {

    constructor(
        private googleAnalyticsService: GoogleAnalyticsService
    ) {}

    canActivate(route: ActivatedRouteSnapshot): boolean {

        const queryParams = {...route.queryParams};

        for (const queryParam of Object.getOwnPropertyNames(queryParams)) {
            this.googleAnalyticsService.eventEmitter('entered via ref link', {[queryParam]: queryParams[queryParam]});
        }

        return true;
    }
}
