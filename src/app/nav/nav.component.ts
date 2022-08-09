import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  faEllipsisV,
  faTasks,
  faUser,
  faGear,
  faArrowRightFromBracket,
  faEyeSlash
} from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../auth/auth.service';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';
import { ConnectionService } from "../connection.service";
import { UserSettingsComponent } from '../user/views/user-settings/user-settings.component';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss']
})
export class NavComponent implements OnInit {

  isUserDecrypted: boolean;
  isOnline: boolean;
  whileLoginIn: boolean;

  get userPhoto(): string {

    const user = this.authService.user$.value;

    if (user) {
      return user.photoURL;
    }

    return null;
  }

  faTasks = faTasks;
  faUser = faUser;
  faGoogle = faGoogle;
  faEllipsisV = faEllipsisV;
  faGear = faGear;
  faArrowRightFromBracket = faArrowRightFromBracket;
  faEyeSlash = faEyeSlash;
  @ViewChild('menuToggleCheckbox') menuToggleCheckbox: ElementRef;

  constructor(
    private authService: AuthService,
    private dialog: MatDialog,
    private connectionService: ConnectionService
  ) {
  }

  ngOnInit(): void {
    this.authService.isUserDecrypted$.subscribe((isUserDecrypted) => this.isUserDecrypted = isUserDecrypted);
    this.authService.whileLoginIn$.subscribe((whileLoginIn) => this.whileLoginIn = whileLoginIn);
    this.connectionService.isOnline$.subscribe((isOnline) => this.isOnline = isOnline);
  }

  googleSignIn(): void {
    this.authService.googleSignIn();
  }

  anonymouslySignIn(): void {
    this.authService.anonymouslySignIn();
  }

  async signOut(): Promise<void> {
    await this.authService.signOut();
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
