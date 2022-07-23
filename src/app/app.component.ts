import { ChangeDetectorRef, Component } from '@angular/core';

import { AuthService } from './auth/auth.service';
import { ConnectionService } from './connection.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  get whileLoginIn(): boolean {
    return this.authService.whileLoginIn;
  }

  isUserDecrypted$ = this.authService.isUserDecrypted$;
  isOnline$ = this.connectionService.isOnline$;

  constructor(
    private authService: AuthService,
    private connectionService: ConnectionService,
    private cdr: ChangeDetectorRef
  ) {
    this.connectionService.wasTabInactive$.subscribe((wasTabInactive) => {
      if (wasTabInactive) {
        this.cdr.markForCheck();
      }
    });
  }
}
