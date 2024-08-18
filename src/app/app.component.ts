import {Component} from '@angular/core';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {RouterOutlet} from '@angular/router';
import {NavComponent} from './components/nav/nav.component';
import {ConnectionService} from './services';
import {AuthService} from './services/auth.service';

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
