import {CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition} from '@angular/cdk/overlay';
import {NgClass, NgStyle, NgTemplateOutlet} from '@angular/common';
import {Component, computed, ElementRef, ViewChild, ViewEncapsulation} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatDialog} from '@angular/material/dialog';
import {MatMenuModule} from '@angular/material/menu';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatToolbarModule} from '@angular/material/toolbar';
import {Router} from '@angular/router';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faGoogle} from '@fortawesome/free-brands-svg-icons';
import {
  faArrowRightFromBracket,
  faAt,
  faEllipsisV,
  faEyeSlash,
  faGear,
  faUser
} from '@fortawesome/free-solid-svg-icons';
import {catchError, NEVER} from 'rxjs';
import {InternalImgSecureDirective} from '../../directives/internal-img-secure.directive';
import {SvgDirective} from '../../directives/svg.directive';
import {AuthService} from '../../services/auth.service';
import {ConnectionService} from '../../services/connection.service';
import {LayoutService} from '../../services/layout.service';
import {ThemeSelectorService} from '../../services/theme-selector.service';
import {handleTabIndex} from '../../utils/handle-tabindex';
import {AuthFormComponent} from '../auth-form/auth-form.component';
import {ButtonComponent} from '../button/button.component';
import {MenuItemComponent} from '../menu/menu-item/menu-item.component';
import {MenuComponent} from '../menu/menu.component';
import {UserSettingsComponent} from '../user-settings/user-settings.component';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [MatToolbarModule, MatButtonModule, MatMenuModule, FontAwesomeModule, InternalImgSecureDirective, NgStyle, NgClass, ButtonComponent, CdkConnectedOverlay, CdkOverlayOrigin, MenuComponent, NgTemplateOutlet, SvgDirective, MenuItemComponent],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'app-nav'
  }
})
export class NavComponent {

  protected _cdkConnectedOverlayPositions: ConnectedPosition[] = [
    {
      overlayX: "end",
      overlayY: "top",
      originX: "end",
      originY: "bottom"
    }
  ]

  protected readonly _showNavMenuLogin = this._layoutService.showNavMenuLoginSig.get();
  protected readonly _popUpView = this._layoutService.popUpView.get();
  protected readonly _closePopUpButtonRef = this._layoutService.closePopUpButtonRefSig.get();

  protected readonly _user = this._authService.userSig.get();
  protected readonly _isOnline = this._connectionService.isOnlineSig.get();
  protected readonly _loadingUser = this._authService.loadingUserSig.get();
  protected readonly _whileLoginIn = this._authService.whileLoginInSig.get();
  protected readonly _authStateReady = this._authService.authStateReady;

  protected readonly _isButtonDisabled = computed(() => !this._isOnline() || this._loadingUser() || this._whileLoginIn());

  protected readonly _faUser = faUser;
  protected readonly _faGoogle = faGoogle;
  protected readonly _faEllipsisV = faEllipsisV;
  protected readonly _faGear = faGear;
  protected readonly _faArrowRightFromBracket = faArrowRightFromBracket;
  protected readonly _faEyeSlash = faEyeSlash;
  protected readonly _faAt = faAt;
  @ViewChild('menuToggleCheckbox') menuToggleCheckbox!: ElementRef;

  protected readonly _darkMode = this._themeSelectorService.darkModeSig.get();

  constructor(
    private readonly _authService: AuthService,
    private readonly _dialog: MatDialog,
    private readonly _connectionService: ConnectionService,
    private readonly _snackBar: MatSnackBar,
    private readonly _themeSelectorService: ThemeSelectorService,
    private readonly _layoutService: LayoutService,
    private readonly _router: Router
  ) {
  }

  googleSignIn(): void {
    this._authService.googleSignIn().pipe(catchError(() => {
      this._snackBar.open('Some went wrong 🤫 Try again 🙂');
      return NEVER;
    })).subscribe();
  }

  anonymouslySignIn(): void {
    this._authService.anonymouslySignIn().pipe(catchError(() => {
      this._snackBar.open('Some went wrong 🤫 Try again 🙂');
      return NEVER;
    })).subscribe();
  }

  signOut(): void {
    this._authService.signOut().subscribe();
  }

  openAuthFormComponent(): void {
    this._router.navigate(['/auth'])
    // this._dialog.open(AuthFormComponent, {
    //   maxWidth: '100vw',
    //   maxHeight: '100vh',
    //   height: '100%',
    //   width: '100%',
    //   panelClass: ['full-screen-modal', 'full-screen-modal-without-padding']
    // });
  }

  openUserSetting() {
    this._dialog.open(UserSettingsComponent, {
      maxWidth: '100vw',
      maxHeight: '100vh',
      height: '100%',
      width: '100%',
      panelClass: 'full-screen-modal'
    });
  }

  setShowNavMenuLogin($event: KeyboardEvent | MouseEvent) {

    if (handleTabIndex($event)) return;
    $event.preventDefault();
    $event.stopPropagation();

    if ($event instanceof KeyboardEvent) {
      if ($event.code !== 'Space' && $event.code !== 'Enter') {
        return;
      }
    }

    this._layoutService.showNavMenuLoginSig.set(!this._showNavMenuLogin());
  }

  protected closeLoginView($event: KeyboardEvent | MouseEvent) {

    if (handleTabIndex($event)) return;
    $event.preventDefault();
    $event.stopPropagation();

    if ($event instanceof KeyboardEvent) {
      if ($event.code !== 'Space' && $event.code !== 'Enter') {
        return;
      }
    }

    this._layoutService.popUpView.set(false);
  }

  setDarkMode(darkMode: boolean) {

    if (darkMode) {
      this._themeSelectorService.setDark();
    } else {
      this._themeSelectorService.setLight();
    }
  }
}
