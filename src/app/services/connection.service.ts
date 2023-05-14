import {Injectable} from '@angular/core';
import {BehaviorSubject, fromEvent, map, merge} from 'rxjs';

@Injectable()
export class ConnectionService {

  isOnline$ = new BehaviorSubject<boolean>(true);
  wasTabInactive$ = fromEvent(document, 'visibilitychange').pipe(map(() => document.visibilityState === 'visible'));

  constructor() {
    merge(
      fromEvent(window, 'online'),
      fromEvent(window, 'offline')
    ).subscribe((event) => this.isOnline$.next(event.type === 'online'))
  }
}
