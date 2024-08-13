import {Component, signal} from '@angular/core';
import {AuthService} from '../../services/auth.service';
import {RemoteConfigService} from '../../services/remote-config.service';
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

  protected readonly _isHiddenUserDataPolicy = signal(true);
  protected readonly _loadingUser = this._authService.loadingUserSig.get();
  protected readonly _guestComponentConfig: GuestComponentConfig | undefined;

  constructor(
    private readonly _authService: AuthService,
    private readonly _remoteConfigService: RemoteConfigService
  ) {
    this._guestComponentConfig = this._remoteConfigService.getValue<GuestComponentConfig>('guestComponent');
  }

  toggleIsHiddenUserDataPolicy() {
    this._isHiddenUserDataPolicy.update((val) => !val);
  }

  renewCookie() {
    // @ts-ignore
    Cookiebot.renew();
  }
}
