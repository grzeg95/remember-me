import {Component} from '@angular/core';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {RouterOutlet} from '@angular/router';
import {NavComponent} from './components/nav/nav.component';
import {AuthService} from './services/auth.service';
import {ConnectionService} from './services/connection.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatProgressSpinnerModule, NavComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  protected readonly _whileLoginIn = this.authService.whileLoginInSig.get();
  protected readonly _isOnline = this.connectionService.isOnlineSig.get();

  constructor(
    private authService: AuthService,
    private connectionService: ConnectionService
  ) {
  }
}
