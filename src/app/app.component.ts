import {ChangeDetectorRef, Component} from '@angular/core';
import {AuthService} from './auth/auth.service';
import {ConnectionService} from './connection.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  whileLoginIn$ = this.authService.whileLoginIn$;
  isWaitingForCryptoKey: boolean;
  user$ = this.authService.user$;
  isOnline$ = this.connectionService.isOnline$;

  constructor(
    private authService: AuthService,
    private connectionService: ConnectionService,
    private cdr: ChangeDetectorRef
  ) {

    this.authService.isWaitingForCryptoKey$.subscribe((isWaitingForCryptoKey) => this.isWaitingForCryptoKey = isWaitingForCryptoKey);
    this.connectionService.wasTabInactive$.subscribe((wasTabInactive) => {
      if (wasTabInactive) {
        this.cdr.markForCheck();
      }
    });
    this.connectionService.isOnline$.subscribe((isOnline) => {
      if (isOnline) {
        this.cdr.markForCheck();
      }
    });
  }
}
