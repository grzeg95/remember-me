import {Injectable} from '@angular/core';

declare let gtag: (...arguments: any) => void;

@Injectable({
  providedIn: 'root'
})
export class GoogleAnalyticsService {

  eventEmitter(
     eventName: string,
     eventCategory: string,
     eventAction: string = null,
     eventLabel: string = null,
     eventValue: any = null
  ): void {
    gtag('event', eventName, {
      eventCategory,
      eventLabel,
      eventAction,
      eventValue
    });
  }
}
