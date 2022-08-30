import {Inject, Injectable} from '@angular/core';
import {Analytics, AnalyticsCallOptions, logEvent} from '@firebase/analytics';
import {ANALYTICS} from './angular-firebase-injectors';

@Injectable()
export class AngularFirebaseAnalyticsService {

  constructor(
    @Inject(ANALYTICS) private readonly analytics: Analytics
  ) {
  }

  logEvent(eventName: string, eventParams?: {[p: string]: any}, options?: AnalyticsCallOptions): void {
    return logEvent(this.analytics, eventName, eventParams, options);
  }
}
