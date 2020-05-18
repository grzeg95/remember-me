import {Component} from '@angular/core';

import {environment} from '../environments/environment';
import {AppService} from './app-service';
import {AuthService} from './auth/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass'],
  host: {class: 'app'}
})
export class AppComponent {

  get isLoggedIn(): boolean | null {
    return this.authService.isLoggedIn;
  }

  get isConnected(): boolean {
    return this.appService.isConnected$.getValue();
  }

  constructor(private appService: AppService,
              private authService: AuthService) {
    if (environment.production) {
      console.log = () => {};
      console.error = () => {};
      console.warn = () => {};
      console.info = () => {};
    }
  }
}
