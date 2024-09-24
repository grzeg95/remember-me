import {CdkOverlayOrigin} from '@angular/cdk/overlay';
import { Component } from '@angular/core';
import {InternalImgSecureDirective} from '../../directives/internal-img-secure.directive';
import {SvgDirective} from '../../directives/svg.directive';
import {AuthService} from '../../services/auth.service';
import {ThemeSelectorService} from '../../services/theme-selector.service';

@Component({
  selector: 'app-user-photo',
  standalone: true,
  imports: [
    InternalImgSecureDirective,
    SvgDirective
  ],
  templateUrl: './user-photo.component.html',
  styleUrl: './user-photo.component.scss'
})
export class UserPhotoComponent {

  protected readonly _user = this._authService.userSig.get();
  protected readonly _authStateReady = this._authService.authStateReady;
  protected readonly _darkMode = this._themeSelectorService.darkModeSig.get();

  constructor(
    private readonly _authService: AuthService,
    private readonly _themeSelectorService: ThemeSelectorService
  ) {
  }
}
