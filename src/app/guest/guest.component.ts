import {ChangeDetectionStrategy, Component} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {AngularFirebaseRemoteConfigService} from 'angular-firebase';
import {AuthService} from 'auth';

interface GuestComponentConfig {
  footerLines: string[]
}

@Component({
  selector: 'app-guest',
  templateUrl: './guest.component.html',
  styleUrls: ['./guest.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GuestComponent {

  showUserDataPolicy = false;
  whileLoginIn = toSignal(this.authService.whileLoginIn$);
  guestComponentConfig: GuestComponentConfig;

  constructor(
    private authService: AuthService,
    private angularFirebaseRemoteConfigService: AngularFirebaseRemoteConfigService
  ) {
    this.guestComponentConfig = this.angularFirebaseRemoteConfigService.getValue<GuestComponentConfig>('guestComponent');
  }

  renewCookie() {
    // @ts-ignore
    Cookiebot.renew();
  }
}
