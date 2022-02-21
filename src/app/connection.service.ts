import {Injectable} from '@angular/core';
import {BehaviorSubject, fromEvent} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConnectionService {

  stateChange$ = new BehaviorSubject<boolean>(true);
  wasTabInactive$ = new BehaviorSubject<boolean>(false);

  constructor() {
    fromEvent(window, 'online').subscribe(() => {
      this.stateChange$.next(true);
    });

    fromEvent(window, 'offline').subscribe(() => {
      this.stateChange$.next(false);
    });

    fromEvent(document, 'visibilitychange').subscribe(() => {
      this.wasTabInactive$.next(document.visibilityState === 'visible');
    });
  }
}
