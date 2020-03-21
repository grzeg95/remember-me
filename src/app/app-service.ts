import {Injectable} from '@angular/core';
import { ConnectionService } from 'ng-connection-service';
import {Subject} from 'rxjs';

@Injectable()
export class AppService {

  dialogOpen = false;
  $isConnected: Subject<boolean> = new Subject();
  isConnected = true;

  constructor(private connectionService: ConnectionService) {
    this.connectionService.monitor().subscribe((isConnected) => {
      this.isConnected = isConnected;
      this.$isConnected.next(isConnected);
    });
  }

}
