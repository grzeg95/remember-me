import {Injectable} from '@angular/core';
import {BehaviorSubject, fromEvent, Subject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConnectionService {

  isOnline$ = new BehaviorSubject<boolean>(true);
  wasTabInactive$ = new Subject<boolean>();

  constructor() {
    fromEvent(window, 'online').subscribe(() => {
      this.isOnline$.next(true);
    });

    fromEvent(window, 'offline').subscribe(() => {
      this.isOnline$.next(false);
    });

    fromEvent(document, 'visibilitychange').subscribe(() => {
      this.wasTabInactive$.next(document.visibilityState === 'visible');
    });
  }
}
