import {Injectable} from '@angular/core';
import {fromEvent, map, merge, startWith} from 'rxjs';

@Injectable()
export class ConnectionService {

  readonly isOnline$ = merge(
    fromEvent(window, 'online'),
    fromEvent(window, 'offline')
  ).pipe(
    startWith({type: 'online'}),
    map((event: {type: string}) => {
      return event.type === 'online'
    })
  )
}
