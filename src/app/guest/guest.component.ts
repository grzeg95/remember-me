import {Component} from '@angular/core';
import {AngularFireAnalytics} from '@angular/fire/compat/analytics';
import {MatDialog} from '@angular/material/dialog';
import {Observable} from 'rxjs';
import {AuthService} from '../auth/auth.service';
import {GuestAboutSecurityComponent} from './guest-about-security/guest-about-security.component';

@Component({
  selector: 'app-guest',
  templateUrl: './guest.component.html',
  styleUrls: ['./guest.component.scss']
})
export class GuestComponent {

  constructor(
    private dialog: MatDialog,
    private analytics: AngularFireAnalytics,
    private authService: AuthService
  ) {
  }

  get userIsReady$(): Observable<boolean> {
    return this.authService.userIsReady$;
  }

  get isUserLoggedIn$(): Observable<boolean | null> {
    return this.authService.isUserLoggedIn$;
  }

  openGuestAboutSecurityDialog(from: string) {
    this.analytics.logEvent('openGuestAboutSecurityDialog', {from}).finally(() => {
      this.dialog.open(GuestAboutSecurityComponent, {
        maxWidth: '100vw',
        maxHeight: '100vh',
        height: '100%',
        width: '100%',
        panelClass: 'full-screen-modal'
      });
    });
  }
}
