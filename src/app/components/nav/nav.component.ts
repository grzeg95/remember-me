import {AsyncPipe, NgClass, NgStyle} from '@angular/common';
import {Component, computed, ElementRef, ViewChild} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatDialog} from '@angular/material/dialog';
import {MatMenuModule} from '@angular/material/menu';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatToolbarModule} from '@angular/material/toolbar';
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
import {catchError, NEVER, combineLatest, map} from 'rxjs';
import {InternalImgSecureDirective} from '../../directives/internal-img-secure.directive';
import {SvgDirective} from '../../directives/svg.directive';
import {AuthService} from '../../services/auth.service';
import {ConnectionService} from '../../services/connection.service';
import {AuthFormComponent} from '../auth-form/auth-form.component';
import {UserSettingsComponent} from '../user-settings/user-settings.component';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [MatToolbarModule, MatButtonModule, MatMenuModule, FontAwesomeModule, InternalImgSecureDirective, NgStyle, NgClass, SvgDirective, AsyncPipe],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss'
})
export class NavComponent {

  protected readonly _user$ = this._authService.user$;
  protected readonly _isOnline$ = this._connectionService.isOnline$;
  protected readonly _loadingUser$ = this._authService.loadingUser$;
  protected readonly _whileLoginIn$ = this._authService.whileLoginIn$;

  protected readonly _isButtonDisabled$ = combineLatest([
    this._isOnline$,
    this._loadingUser$
  ]).pipe(
    map(([isOnline, loadingUser]) => isOnline || loadingUser)
  );

  protected readonly _faUser = faUser;
  protected readonly _faGoogle = faGoogle;
  protected readonly _faEllipsisV = faEllipsisV;
  protected readonly _faGear = faGear;
  protected readonly _faArrowRightFromBracket = faArrowRightFromBracket;
  protected readonly _faEyeSlash = faEyeSlash;
  protected readonly _faAt = faAt;
  @ViewChild('menuToggleCheckbox') menuToggleCheckbox!: ElementRef;

  constructor(
    private readonly _authService: AuthService,
    private readonly _dialog: MatDialog,
    private readonly _connectionService: ConnectionService,
    private readonly _snackBar: MatSnackBar
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
    this._dialog.open(AuthFormComponent, {
      maxWidth: '100vw',
      maxHeight: '100vh',
      height: '100%',
      width: '100%',
      panelClass: ['full-screen-modal', 'full-screen-modal-without-padding']
    });
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
}
