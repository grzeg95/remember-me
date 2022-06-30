import {Component} from '@angular/core';
import {AuthService} from '../auth/auth.service';

@Component({
  selector: 'app-guest',
  templateUrl: './guest.component.html',
  styleUrls: ['./guest.component.scss']
})
export class GuestComponent {

  showGuestAboutSecurity = false;
  isUserLoggedIn$ = this.authService.isUserLoggedIn$;

  constructor(
    private authService: AuthService
  ) {
  }
}
