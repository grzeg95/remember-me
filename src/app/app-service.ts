import {Injectable} from '@angular/core';
import {ConnectionService} from './connection.service';
import {BehaviorSubject, Observable} from 'rxjs';

@Injectable()
export class AppService {

  get isOnline$(): Observable<boolean> {
    return this._isOnline$.asObservable();
  }

  _isOnline$: BehaviorSubject<boolean> = new BehaviorSubject(true);

  constructor(private connectionService: ConnectionService) {
    this.connectionService.stateChange$.subscribe((isOnline) =>
      this._isOnline$.next(isOnline)
    );
  }
}
