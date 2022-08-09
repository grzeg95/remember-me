import { Component } from '@angular/core';
import { AuthService } from "../auth/auth.service";

@Component({
  selector: 'app-guest',
  templateUrl: './guest.component.html',
  styleUrls: ['./guest.component.scss']
})
export class GuestComponent {

  showUserDataPolicy = false;
  whileLoginIn$ = this.authService.whileLoginIn$;

  constructor(
    private authService: AuthService
  ) {
  }

  renewCookie() {
    // @ts-ignore
    Cookiebot.renew();
  }
}
