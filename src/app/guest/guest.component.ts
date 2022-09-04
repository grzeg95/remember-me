import {Component} from '@angular/core';
import {AngularFirebaseRemoteConfigService} from "angular-firebase";
import {AuthService} from 'auth';
import {defaultGuestComponentConfig, GuestComponentConfig} from '../config.model';

@Component({
  selector: 'app-guest',
  templateUrl: './guest.component.html',
  styleUrls: ['./guest.component.scss']
})
export class GuestComponent {

  showUserDataPolicy = false;
  whileLoginIn$ = this.authService.whileLoginIn$;
  guestComponentConfig = defaultGuestComponentConfig;

  constructor(
    private authService: AuthService,
    private angularFirebaseRemoteConfigService: AngularFirebaseRemoteConfigService
  ) {

    const guestComponentConfig = this.angularFirebaseRemoteConfigService.getValue<GuestComponentConfig>('guestComponent');

    if (guestComponentConfig.motto) {
      this.guestComponentConfig.motto = guestComponentConfig.motto;
    }

    if (guestComponentConfig.lastUpdate) {
      this.guestComponentConfig.lastUpdate = guestComponentConfig.lastUpdate;
    }
  }

  renewCookie() {
    // @ts-ignore
    Cookiebot.renew();
  }
}
