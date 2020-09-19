import {Component} from '@angular/core';
import {Observable} from 'rxjs';

import {environment} from '../environments/environment';
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

  get isConnected$(): Observable<boolean> {
    return this.appService.isConnected$;
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
