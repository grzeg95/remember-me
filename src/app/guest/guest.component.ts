import {Component} from '@angular/core';
import {Observable} from 'rxjs';
import {AuthService} from '../auth/auth.service';

@Component({
  selector: 'app-guest',
  templateUrl: './guest.component.html',
  styleUrls: ['./guest.component.scss']
})
export class GuestComponent {

  showGuestAboutSecurity = false;

  constructor(
    private authService: AuthService
  ) {
  }

  get userIsReady$(): Observable<boolean> {
    return this.authService.userIsReady$;
  }

  get isUserLoggedIn$(): Observable<boolean | null> {
    return this.authService.isUserLoggedIn$;
  }
}
