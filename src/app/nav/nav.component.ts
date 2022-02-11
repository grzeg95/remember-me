import {Component, ElementRef, ViewChild} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {faEllipsisV, faTasks, faUser, faGear, faArrowRightFromBracket} from '@fortawesome/free-solid-svg-icons';
import {Observable} from 'rxjs';
import {AppService} from '../app-service';
import {AuthService} from '../auth/auth.service';
import {faGoogle, faFacebook} from '@fortawesome/free-brands-svg-icons';
import {UserSettingsComponent} from '../user/views/user-settings/user-settings.component';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss']
})
export class NavComponent {

  get isOnline$(): Observable<boolean> {
    return this.appService.isOnline$;
  }

  get isUserLoggedIn$(): Observable<boolean | null> {
    return this.authService.isUserLoggedIn$;
  }

  get userPhoto(): string {

    if (this.authService.userData) {
      return this.authService.userData.photoURL;
    }

    return null;
  }

  get whileLoginIn(): boolean {
    return this.authService.whileLoginIn;
  }

  faTasks = faTasks;
  faUser = faUser;
  faFacebook = faFacebook;
  faGoogle = faGoogle;
  faEllipsisV = faEllipsisV;
  faGear = faGear;
  faArrowRightFromBracket = faArrowRightFromBracket;
  @ViewChild('menuToggleCheckbox') menuToggleCheckbox: ElementRef;

  constructor(
    private authService: AuthService,
    private appService: AppService,
    private dialog: MatDialog
  ) {
  }

  googleLogin(): void {
    this.authService.googleLogin();
  }

  facebookLogin(): void {
    this.authService.facebookLogin();
  }

  signOut(): Promise<boolean> {
    return this.authService.signOut();
  }

  openUserSetting() {
    this.dialog.open(UserSettingsComponent,{
      maxWidth: '100vw',
      maxHeight: '100vh',
      height: '100%',
      width: '100%',
      panelClass: 'full-screen-modal'
    });
  }
}
