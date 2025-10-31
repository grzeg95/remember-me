import {Dialog} from '@angular/cdk/dialog';
import {CdkMenu, CdkMenuItem, CdkMenuTrigger} from '@angular/cdk/menu';
import {Component, inject, ViewEncapsulation} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {Router} from '@angular/router';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faGoogle} from '@fortawesome/free-brands-svg-icons';
import {faAt, faEyeSlash, faUser} from '@fortawesome/free-solid-svg-icons';
import {RouterDict} from '../../models/router-dict';
import {Auth} from '../../services/auth';
import {Theme} from '../../services/theme';
import {Button} from '../../ui/button/button';
import {SnackBar} from '../../ui/snack-bar/snack-bar';
import {AuthDialog} from '../dialog/auth-dialog/auth-dialog';
import {UserSettingsDialog} from '../dialog/user-settings-dialog/user-settings-dialog';

@Component({
  selector: 'app-nav',
  imports: [
    CdkMenuTrigger,
    CdkMenu,
    CdkMenuItem,
    FaIconComponent,
    Button
  ],
  templateUrl: './nav.html',
  styleUrl: './nav.scss',
  host: {
    'class': 'app-nav',
  },
  encapsulation: ViewEncapsulation.None
})
export class Nav {

  private readonly _snackBar = inject(SnackBar);
  private readonly _router = inject(Router);
  private readonly _auth = inject(Auth);
  protected readonly _userInitialized = toSignal(this._auth.userInitialized$);
  protected readonly _userLoggedIn = toSignal(this._auth.userLoggedIn$);
  protected readonly _firestoreUser = toSignal(this._auth.firestoreUser$);

  private readonly _dialog = inject(Dialog);
  private readonly _theme = inject(Theme);
  protected _isDarkMode = toSignal(this._theme.isDarkMode$);

  protected _toggleTheme() {
    this._theme.toggleTheme();
  }

  protected readonly faGoogle = faGoogle;
  protected readonly faAt = faAt;
  protected readonly faEyeSlash = faEyeSlash;
  protected readonly faUser = faUser;

  openAuthDialog() {
    this._dialog.open(AuthDialog, {
      width: '100%',
      height: '100%',
      autoFocus: false,
      disableClose: true,
      hasBackdrop: false,
      closeOnNavigation: true
    });
  }

  _signOut() {
    this._auth.signOut();
  }

  signInAnonumously() {

    this._auth.signInAnonymously$().subscribe({
      next: () => {
        this._router.navigate(['/', RouterDict.rounds, RouterDict.roundsList]);
      },
      error: (error) => {

        const errorMap = new Map<string, string>();

        errorMap.set('Unknown', 'Unknown error. Try again.');

        let message = errorMap.get('Unknown')!;

        if (errorMap.has(error.code)) {
          message = errorMap.get(error.code)!;
        }

        this._snackBar.open(message, {duration: 3000});
      }
    });
  }

  signInWithGoogle() {
    this._auth.signInWithGoogle$().subscribe({
      next: () => {
        this._router.navigate(['/', RouterDict.rounds, RouterDict.roundsList]);
      },
      error: (error) => {

        const errorMap = new Map<string, string>();

        errorMap.set('Unknown', 'Unknown error. Try again.');

        let message = errorMap.get('Unknown')!;

        if (errorMap.has(error.code)) {
          message = errorMap.get(error.code)!;
        }

        this._snackBar.open(message, {duration: 3000});
      }
    });
  }

  _openSettings() {
    this._dialog.open(UserSettingsDialog, {
      width: '100%',
      height: '100%',
      autoFocus: false,
      disableClose: true,
      hasBackdrop: false,
      closeOnNavigation: true
    });
  }

  protected readonly _faUser = faUser;
}
