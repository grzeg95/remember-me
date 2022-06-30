import {ChangeDetectorRef, Component} from '@angular/core';
import {Subscription} from 'rxjs';

import {AppService} from './app-service';
import {AuthService} from './auth/auth.service';
import {ConnectionService} from './connection.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  get isUserLoggedInNotReady(): boolean {
    return this.isUserLoggedIn && !this.isUserReady;
  }

  isUserReady: boolean;
  isUserReadySub: Subscription;

  isUserLoggedIn: boolean;
  isUserLoggedInSub: Subscription;

  isOnline$ = this.appService.isOnline$;

  constructor(
    private appService: AppService,
    private authService: AuthService,
    private connectionService: ConnectionService,
    private cdr: ChangeDetectorRef
  ) {
    this.connectionService.wasTabInactive$.subscribe((wasTabInactive) => {
      if (wasTabInactive) {
        this.cdr.markForCheck();
      }
    });

    this.isUserReadySub = this.authService.isUserReady$.subscribe((isUserReady) => this.isUserReady = isUserReady);
    this.isUserLoggedInSub = this.authService.isUserLoggedIn$.subscribe((isUserLoggedIn) => this.isUserLoggedIn = isUserLoggedIn);
  }
}
