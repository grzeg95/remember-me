import {Component} from '@angular/core';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {RouterOutlet} from '@angular/router';
import {AuthService} from 'auth';
import {ConnectionService} from 'services';
import {NavComponent} from './nav/nav.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatProgressSpinnerModule, NavComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  whileLoginIn = this.authService.whileLoginIn;
  isOnline = this.connectionService.isOnline;

  constructor(
    private authService: AuthService,
    private connectionService: ConnectionService
  ) {
  }
}
