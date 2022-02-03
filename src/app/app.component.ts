import {Component} from '@angular/core';
import {Observable} from 'rxjs';

import {AppService} from './app-service';
import {AuthService} from './auth/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  get userIsReady$(): Observable<boolean> {
    return this.authService.userIsReady$;
  }

  get isUserLoggedIn$(): Observable<boolean | null> {
    return this.authService.isUserLoggedIn$;
  }

  get isOnline$(): Observable<boolean> {
    return this.appService.isOnline$;
  }

  constructor(private appService: AppService,
              private authService: AuthService) {
  }
}
