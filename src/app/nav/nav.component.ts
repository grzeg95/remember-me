import {NgClass, NgStyle} from '@angular/common';
import {Component, computed, ElementRef, ViewChild} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
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
import {AuthFormComponent, AuthService} from 'auth';
import {catchError, NEVER} from 'rxjs';
import {ConnectionService} from 'services';
import {InternalImgSecureDirective} from '../directives/internal-img-secure.directive';
import {UserSettingsComponent} from '../user/views/user-settings/user-settings.component';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [MatToolbarModule, MatButtonModule, MatMenuModule, FontAwesomeModule, InternalImgSecureDirective, NgStyle, NgClass],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss'
})
export class NavComponent {

  user = toSignal(this.authService.user$);
  isButtonDisabled = computed(() => !this.connectionService.isOnline() || this.authService.whileLoginIn());

  faUser = faUser;
  faGoogle = faGoogle;
  faEllipsisV = faEllipsisV;
  faGear = faGear;
  faArrowRightFromBracket = faArrowRightFromBracket;
  faEyeSlash = faEyeSlash;
  faAt = faAt;
  @ViewChild('menuToggleCheckbox') menuToggleCheckbox!: ElementRef;

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
