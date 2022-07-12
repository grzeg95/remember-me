import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {faEllipsisV, faTasks, faUser, faGear, faArrowRightFromBracket, faEyeSlash} from '@fortawesome/free-solid-svg-icons';
import {AppService} from '../app-service';
import {AuthService} from '../auth/auth.service';
import {faGoogle} from '@fortawesome/free-brands-svg-icons';
import {UserSettingsComponent} from '../user/views/user-settings/user-settings.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss']
})
export class NavComponent implements OnInit {

  isUserLoggedIn: boolean;
  isUserLoggedInSub: Subscription;

  isOnline: boolean;
  isOnlineSub: Subscription;

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
  faGoogle = faGoogle;
  faEllipsisV = faEllipsisV;
  faGear = faGear;
  faArrowRightFromBracket = faArrowRightFromBracket;
  faEyeSlash = faEyeSlash;
  @ViewChild('menuToggleCheckbox') menuToggleCheckbox: ElementRef;

  constructor(
    private authService: AuthService,
    private appService: AppService,
    private dialog: MatDialog
  ) {
  }

  ngOnInit(): void {
    this.isUserLoggedInSub = this.authService.isUserLoggedIn$.subscribe((isUserLoggedIn) => this.isUserLoggedIn = isUserLoggedIn);
    this.isOnlineSub = this.appService.isOnline$.subscribe((isOnline) => this.isOnline = isOnline);
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
