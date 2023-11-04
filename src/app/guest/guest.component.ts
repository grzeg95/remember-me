import {Component} from '@angular/core';
import {AngularFirebaseRemoteConfigService} from 'angular-firebase';
import {AuthService} from 'auth';

interface GuestComponentConfig {
  footerLines: string[]
}

@Component({
  selector: 'app-guest',
  templateUrl: './guest.component.html',
  styleUrls: ['./guest.component.scss']
})
export class GuestComponent {

  showUserDataPolicy = false;
  whileLoginIn$ = this.authService.whileLoginIn$;
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
