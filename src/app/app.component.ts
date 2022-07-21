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

  get whileLoginIn(): boolean {
    return this.authService.whileLoginIn;
  }

  isUserDecrypted: boolean;
  isUserDecryptedSub: Subscription;

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

    this.isUserDecryptedSub = this.authService.isUserDecrypted$.subscribe((isUserDecrypted) => this.isUserDecrypted = isUserDecrypted);
  }
}
