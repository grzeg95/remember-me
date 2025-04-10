import {Component} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {RouterOutlet} from '@angular/router';
import {NavComponent} from './components/nav/nav.component';
import {ConnectionService} from './services/connection.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatProgressSpinnerModule, NavComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  protected readonly _isOnline = toSignal(this.connectionService.isOnline$);

  constructor(
    private connectionService: ConnectionService
  ) {
  }
}
