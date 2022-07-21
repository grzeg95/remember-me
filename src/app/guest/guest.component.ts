import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from "rxjs";
import { AuthService } from "../auth/auth.service";

@Component({
  selector: 'app-guest',
  templateUrl: './guest.component.html',
  styleUrls: ['./guest.component.scss']
})
export class GuestComponent implements OnInit, OnDestroy {

  showGuestAboutSecurity = false;

  get whileLoginIn(): boolean {
    return this.authService.whileLoginIn;
  }

  isUserLoggedIn: boolean;
  isUserLoggedInSub: Subscription;

  constructor(
    private authService: AuthService
  ) {
  }

  ngOnInit(): void {
    this.isUserLoggedInSub = this.authService.isUserLoggedIn$.subscribe((isUserLoggedIn) => this.isUserLoggedIn = isUserLoggedIn);
  }

  ngOnDestroy(): void {
    this.isUserLoggedInSub.unsubscribe();
  }
}
