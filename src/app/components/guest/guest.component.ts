import {Component, signal} from '@angular/core';
import {AngularFirebaseRemoteConfigService} from '../../services/angular-firebase-remote-config.service';
import {AuthService} from '../../services/auth.service';
import {UserDataPolicyComponent} from '../user-data-policy/user-data-policy.component';

interface GuestComponentConfig {
  footerLines: string[]
}

@Component({
  selector: 'app-guest',
  standalone: true,
  templateUrl: './guest.component.html',
  imports: [UserDataPolicyComponent],
  styleUrls: ['./guest.component.scss']
})
export class GuestComponent {

  isHiddenUserDataPolicy = signal(true);
  whileLoginIn = this.authService.whileLoginIn;
  guestComponentConfig: GuestComponentConfig | undefined;

  constructor(
    private authService: AuthService,
    private angularFirebaseRemoteConfigService: AngularFirebaseRemoteConfigService
  ) {
    this.guestComponentConfig = this.angularFirebaseRemoteConfigService.getValue<GuestComponentConfig>('guestComponent');
  }

  toggleIsHiddenUserDataPolicy() {
    this.isHiddenUserDataPolicy.update((val) => !val);
  }

  renewCookie() {
    // @ts-ignore
    Cookiebot.renew();
  }
}
