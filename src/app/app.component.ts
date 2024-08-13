import {Component, effect} from '@angular/core';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {RouterOutlet} from '@angular/router';
import {interval, Subscription} from 'rxjs';
import {NavComponent} from './components/nav/nav.component';
import {Day} from './models/day';
import {AuthService} from './services/auth.service';
import {ConnectionService} from './services/connection.service';
import {RoundsService} from './services/rounds.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatProgressSpinnerModule, NavComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  protected _loadingUser = this._authService.loadingUserSig.get();
  protected _isOnline = this._connectionService.isOnlineSig.get();
  protected _now = this._roundsService.nowSig.get();

  private _changeDayIntervalSub: Subscription | undefined;

  constructor(
    private readonly _authService: AuthService,
    private readonly _connectionService: ConnectionService,
    private readonly _roundsService: RoundsService
  ) {

    effect(() => {

      const now = this._now();

      if (!now) {
        return;
      }

      this._roundsService.todaySig.set({
        full: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()],
        short: (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as Day[])[now.getDay()]
      });
    }, {allowSignalWrites: true});

    this.changeDay();
  }

  changeDay() {

    const now = new Date();
    this._roundsService.nowSig.set(now);

    const todayPast = now.getSeconds() + (now.getMinutes() * 60) + (now.getHours() * 60 * 60);
    const toNextDay = (86400 - todayPast) * 1000;

    this._changeDayIntervalSub && !this._changeDayIntervalSub.closed && this._changeDayIntervalSub.unsubscribe();
    this._changeDayIntervalSub = interval(toNextDay).subscribe(() => this.changeDay());
  }
}
