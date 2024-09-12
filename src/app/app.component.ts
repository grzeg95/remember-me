import {Component} from '@angular/core';
import {MatProgressBar} from '@angular/material/progress-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {RouterOutlet} from '@angular/router';
import {NavComponent} from './components/nav/nav.component';
import {OfflineComponent} from './components/offline/offline.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatProgressSpinnerModule, NavComponent, MatProgressBar, OfflineComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
}
