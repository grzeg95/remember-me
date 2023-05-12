import {ChangeDetectionStrategy, Component} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {AuthService} from 'auth';
import {ConnectionService} from 'services';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {

  whileLoginIn = toSignal(this.authService.whileLoginIn$);
  isWaitingForCryptoKey = toSignal(this.authService.isWaitingForCryptoKey$);
  user = toSignal(this.authService.user$);
  isOnline = toSignal(this.connectionService.isOnline$);

  constructor(
    private authService: AuthService,
    private connectionService: ConnectionService
  ) {
  }
}
