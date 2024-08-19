import {Component, Inject, signal} from '@angular/core';
import {RemoteConfig} from 'firebase/remote-config';
import {RemoteConfigInjectionToken} from '../../models/firebase';
import {AuthService} from '../../services/auth.service';
import {getValue} from '../../services/firebase/remote-config';
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
    @Inject(RemoteConfigInjectionToken) private readonly remoteConfig: RemoteConfig
  ) {
    this.guestComponentConfig = getValue<GuestComponentConfig>(this.remoteConfig, 'guestComponent');
  }

  toggleIsHiddenUserDataPolicy() {
    this.isHiddenUserDataPolicy.update((val) => !val);
  }

  renewCookie() {
    // @ts-ignore
    Cookiebot.renew();
  }
}
