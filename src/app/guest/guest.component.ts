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

    try {
      const guestComponentConfig = JSON.parse(
        this.angularFirebaseRemoteConfigService.getValue('guestComponent').asString()
      ) as GuestComponentConfig;

      if (guestComponentConfig.motto) {
        this.guestComponentConfig.motto = guestComponentConfig.motto;
      }

      if (guestComponentConfig.lastUpdate) {
        this.guestComponentConfig.lastUpdate = guestComponentConfig.lastUpdate;
      }

    } catch (e) {}
  }

  renewCookie() {
    // @ts-ignore
    Cookiebot.renew();
  }
}
