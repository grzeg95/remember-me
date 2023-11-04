import {Injectable} from '@angular/core';
import {BehaviorSubject, fromEvent, merge} from 'rxjs';

@Injectable()
export class ConnectionService {

  isOnline$ = new BehaviorSubject<boolean>(true);

  constructor() {
    merge(
      fromEvent(window, 'online'),
      fromEvent(window, 'offline')
    ).subscribe((event) => this.isOnline$.next(event.type === 'online'))
  }
}
