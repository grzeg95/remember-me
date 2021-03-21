import {Injectable} from '@angular/core';
import {BehaviorSubject, fromEvent} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConnectionService {

  stateChange$ = new BehaviorSubject<boolean>(true);

  constructor() {
    fromEvent(window, 'online').subscribe(() => {
      this.stateChange$.next(true);
    });

    fromEvent(window, 'offline').subscribe(() => {
      this.stateChange$.next(false);
    });
  }
}
