import {inject} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {AngularFirebaseAnalyticsService} from 'angular-firebase';

export const extraParametersRoutePipe = (): true => {

  const angularFirebaseAnalyticsService = inject(AngularFirebaseAnalyticsService);
  const route = inject(ActivatedRoute);

  const usefulQueryParams = new Set(['fbclid']);
  const queryParams = {...route.queryParams};

  for (const queryParam of Object.getOwnPropertyNames(queryParams)) {
    if (usefulQueryParams.has(queryParam)) {
      angularFirebaseAnalyticsService.logEvent('entered_via_ref_link', {[queryParam]: queryParams[queryParam]});
    } else {
      angularFirebaseAnalyticsService.logEvent('entered_via_unknown_ref_link', {[queryParam]: queryParams[queryParam]});
    }
  }

  return true;
}
