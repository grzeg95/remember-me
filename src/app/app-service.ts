import {Injectable} from '@angular/core';
import {ConnectionService} from './connection.service';
import {BehaviorSubject, Observable} from 'rxjs';

@Injectable()
export class AppService {

  get isConnected$(): Observable<boolean> {
    return this.isConnected.asObservable();
  }

  isConnected: BehaviorSubject<boolean> = new BehaviorSubject(true);

  constructor(private connectionService: ConnectionService) {
    this.connectionService.stateChange$.subscribe((isConnected) =>
      this.isConnected.next(isConnected)
    );
  }
}
