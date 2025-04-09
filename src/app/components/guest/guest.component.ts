import {AsyncPipe} from '@angular/common';
import {Component, Inject} from '@angular/core';
import {RemoteConfig} from 'firebase/remote-config';
import {SvgDirective} from '../../directives/svg.directive';
import {RemoteConfigInjectionToken} from '../../models/firebase';
import {AuthService} from '../../services/auth.service';
import {getValue} from '../../services/firebase/remote-config';

interface GuestComponentConfig {
  footerLines: string[]
}

@Component({
  selector: 'app-guest',
  standalone: true,
  templateUrl: './guest.component.html',
  imports: [
    SvgDirective,
    AsyncPipe
  ],
  styleUrls: ['./guest.component.scss']
})
export class GuestComponent {

  protected readonly _loadingUser$ = this._authService.loadingUser$;
  protected readonly _firebaseUser$ = this._authService.firebaseUser$;

  protected readonly _guestComponentConfig: GuestComponentConfig | undefined;

  constructor(
    private readonly _authService: AuthService,
    @Inject(RemoteConfigInjectionToken) private readonly _remoteConfig: RemoteConfig
  ) {
    this._guestComponentConfig = getValue<GuestComponentConfig>(this._remoteConfig, 'guestComponent');
  }
}
