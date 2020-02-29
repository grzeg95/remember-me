import {Injectable} from '@angular/core';
import {UserIdleService} from 'angular-user-idle';

@Injectable()
export class AppService {

  constructor(private idle: UserIdleService) {
    this.idle.startWatching();
  }

  restartIdle(): void {
    this.idle.stopWatching();
    this.idle.startWatching();
  }

}
