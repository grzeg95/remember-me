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

  get isLoggedIn(): boolean | null {
    return this.authService.isLoggedIn;
  }

  get isOnline$(): Observable<boolean> {
    return this.appService.isOnline$;
  }

  constructor(private appService: AppService,
              private authService: AuthService) {
  }
}
