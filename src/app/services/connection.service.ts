import {Injectable, signal} from '@angular/core';
import {fromEvent, merge} from 'rxjs';

@Injectable()
export class ConnectionService {

  isOnline = signal(true);

  constructor() {
    merge(
      fromEvent(window, 'online'),
      fromEvent(window, 'offline')
    ).subscribe((event) => this.isOnline.set(event.type === 'online'));
  }
}
