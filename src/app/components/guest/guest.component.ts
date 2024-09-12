import {Component, Inject, signal} from '@angular/core';
import {RemoteConfig} from 'firebase/remote-config';
import {RemoteConfigInjectionToken} from '../../models/firebase';
import {AuthService} from '../../services/auth.service';
import {getValue} from '../../services/firebase/remote-config';
import {AppFeaturesComponent} from '../app-features/app-features.component';
import {UserDataPolicyComponent} from '../user-data-policy/user-data-policy.component';

interface GuestComponentConfig {
  footerLines: string[]
}

@Component({
  selector: 'app-guest',
  standalone: true,
  templateUrl: './guest.component.html',
  imports: [UserDataPolicyComponent, AppFeaturesComponent],
  styleUrls: ['./guest.component.scss']
})
export class GuestComponent {

  protected readonly _isHiddenUserDataPolicy = signal(true);
  protected readonly _loadingUser = this._authService.loadingUserSig.get();
  protected readonly _firebaseUser = this._authService.firebaseUser;

  protected readonly _guestComponentConfig: GuestComponentConfig | undefined;

  constructor(
    private readonly _authService: AuthService,
    @Inject(RemoteConfigInjectionToken) private readonly _remoteConfig: RemoteConfig
  ) {
    this._guestComponentConfig = getValue<GuestComponentConfig>(this._remoteConfig, 'guestComponent');
  }

  toggleIsHiddenUserDataPolicy() {
    this._isHiddenUserDataPolicy.update((val) => !val);
  }
}
