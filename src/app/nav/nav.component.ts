import {ChangeDetectionStrategy, Component, computed, ElementRef, ViewChild} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {faGoogle} from '@fortawesome/free-brands-svg-icons';
import {
  faArrowRightFromBracket,
  faArrowRightToBracket,
  faAt,
  faEllipsisV,
  faEyeSlash,
  faGear,
  faTasks,
  faUser
} from '@fortawesome/free-solid-svg-icons';
import {AuthFormComponent, AuthService} from 'auth';
import {catchError, NEVER} from 'rxjs';
import {ConnectionService} from 'services';
import {UserSettingsComponent} from '../user/views/user-settings/user-settings.component';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavComponent {

  user = toSignal(this.authService.user$);
  firebaseUser = toSignal(this.authService.firebaseUser$);
  isOnline = toSignal(this.connectionService.isOnline$);
  whileLoginIn = toSignal(this.authService.whileLoginIn$);

  disableMenuButton = computed(() => !this.isOnline() || this.whileLoginIn())

  faTasks = faTasks;
  faUser = faUser;
  faGoogle = faGoogle;
  faEllipsisV = faEllipsisV;
  faGear = faGear;
  faArrowRightFromBracket = faArrowRightFromBracket;
  faEyeSlash = faEyeSlash;
  faAt = faAt;
  faArrowRightToBracket = faArrowRightToBracket;
  @ViewChild('menuToggleCheckbox') menuToggleCheckbox: ElementRef;

  constructor(
    private authService: AuthService,
    private dialog: MatDialog,
    private connectionService: ConnectionService,
    private snackBar: MatSnackBar
  ) {
  }

  googleSignIn(): void {
    this.authService.googleSignIn().pipe(catchError(() => {
      this.snackBar.open('Some went wrong 🤫 Try again 🙂');
      return NEVER;
    })).subscribe();
  }

  anonymouslySignIn(): void {
    this.authService.anonymouslySignIn().pipe(catchError(() => {
      this.snackBar.open('Some went wrong 🤫 Try again 🙂');
      return NEVER;
    })).subscribe();
  }

  signOut(): void {
    this.authService.signOut().subscribe();
  }

  openAuthFormComponent(): void {
    this.dialog.open(AuthFormComponent, {
      maxWidth: '100vw',
      maxHeight: '100vh',
      height: '100%',
      width: '100%',
      panelClass: ['full-screen-modal', 'full-screen-modal-without-padding']
    });
  }

  openUserSetting() {
    this.dialog.open(UserSettingsComponent, {
      maxWidth: '100vw',
      maxHeight: '100vh',
      height: '100%',
      width: '100%',
      panelClass: 'full-screen-modal'
    });
  }
}
