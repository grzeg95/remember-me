import {Injectable} from '@angular/core';

declare let gtag: (...arguments: any) => void;

@Injectable({
  providedIn: 'root'
})
export class GoogleAnalyticsService {

  eventEmitter(
     eventName: string,
     data: any
  ): void {
    gtag('event', eventName, data);
  }
}
