import {Injectable, signal} from '@angular/core';
import {fromEvent, merge} from 'rxjs';
import {Sig} from '../utils/sig';

@Injectable()
export class ConnectionService {

  readonly isOnlineSig = new Sig(true);

  constructor() {
    merge(
      fromEvent(window, 'online'),
      fromEvent(window, 'offline')
    ).subscribe((event) => this.isOnlineSig.set(event.type === 'online'));
  }
}
