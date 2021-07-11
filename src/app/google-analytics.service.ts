import {Injectable} from '@angular/core';

declare let gtag: (...arguments: any) => void;

@Injectable({
  providedIn: 'root'
})
export class GoogleAnalyticsService {

  eventEmitter(
     eventName: string,
     eventCategory: string,
     eventAction: string,
     eventLabel: string = null,
     eventValue: number = null
  ): void {
    gtag('event', eventName, {
      eventCategory,
      eventLabel,
      eventAction,
      eventValue
    });
  }
}
