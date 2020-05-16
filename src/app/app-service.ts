import {Injectable} from '@angular/core';
import {ConnectionService} from 'ng-connection-service';
import {BehaviorSubject} from 'rxjs';

@Injectable()
export class AppService {

  isConnected$: BehaviorSubject<boolean> = new BehaviorSubject(true);

  constructor(private connectionService: ConnectionService) {
    this.connectionService.monitor().subscribe((isConnected) =>
      this.isConnected$.next(isConnected)
    );
  }

}
