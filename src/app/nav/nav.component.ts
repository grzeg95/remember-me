import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
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
import {AuthFormComponent, AuthService, User} from 'auth';
import {ConnectionService} from '../connection.service';
import {UserSettingsComponent} from '../user/views/user-settings/user-settings.component';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss']
})
export class NavComponent implements OnInit {

  user: User;
  isOnline: boolean;
  whileLoginIn: boolean;

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

  ngOnInit(): void {
    this.authService.user$.subscribe((user) => this.user = user);
    this.authService.whileLoginIn$.subscribe((whileLoginIn) => this.whileLoginIn = whileLoginIn);
    this.connectionService.isOnline$.subscribe((isOnline) => this.isOnline = isOnline);
  }

  googleSignIn(): void {
    this.authService.googleSignIn().catch(() => {
      this.snackBar.open('Some went wrong 🤫 Try again 🙂');
    });
  }

  anonymouslySignIn(): void {
    this.authService.anonymouslySignIn().catch(() => {
      this.snackBar.open('Some went wrong 🤫 Try again 🙂');
    });
  }

  signOut(): void {
    this.authService.signOut();
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
