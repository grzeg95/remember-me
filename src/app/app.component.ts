import {Component} from '@angular/core';
import {AuthService} from 'auth';
import {ConnectionService} from 'services';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  whileLoginIn$ = this.authService.whileLoginIn$;
  isOnline$ = this.connectionService.isOnline$;

  constructor(
    private authService: AuthService,
    private connectionService: ConnectionService
  ) { }
}
