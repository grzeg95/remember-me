import {Component, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router, RouterLink, RouterLinkActive} from '@angular/router';
import {interval, Subscription} from 'rxjs';
import {take} from 'rxjs/operators';
import {RouterDict} from '../../app.constants';
import {AuthService} from '../../services/auth.service';
import {RoundsService} from '../../services/rounds.service';

@Component({
  selector: 'app-round-nav',
  standalone: true,
  templateUrl: './round-nav.component.html',
  imports: [
    RouterLink,
    RouterLinkActive
  ],
  styleUrls: ['./round-nav.component.scss']
})
export class RoundNavComponent {

  protected readonly _RouterDict = RouterDict;

  private _unmarkTodayTasksIntervalSub: Subscription | undefined;

  protected readonly _user = toSignal(this._authService.user$);

  protected readonly _round = toSignal(this._roundsService.round$);
  protected readonly _todayMap = toSignal(this._roundsService.todayMap$);
  protected readonly _today = toSignal(this._roundsService.today$);

  protected readonly _todayTasksViewActive = signal(false);

  constructor(
    private readonly _authService: AuthService,
    private readonly _roundsService: RoundsService,
    private readonly _activatedRoute: ActivatedRoute,
    private readonly _router: Router,
    private readonly _matSnackBar: MatSnackBar
  ) {

    this._activatedRoute.url.subscribe(() => {
      this._todayTasksViewActive.set(this._router.url.indexOf('/' + this._RouterDict.todayTasks) > -1);
    });
  }

  unmarkTodayTasks() {

    const today = this._today();
    const round = this._round();
    const _todayMap = this._todayMap();

    if (!round || !_todayMap || !today) {
      return;
    }

    const todayId = _todayMap.get(today.short)?.id;

    if (!todayId) {
      return;
    }

    this._matSnackBar.open('Unmarking today tasks 👀');

    this._roundsService.unmarkTodayTasks({
      roundId: round.id,
      todayId
    }).subscribe((success) => {
      this._matSnackBar.open(success.details);
    });
  }

  beginUnmarkTodayTasks() {

    this._unmarkTodayTasksIntervalSub && !this._unmarkTodayTasksIntervalSub.closed && this._unmarkTodayTasksIntervalSub.unsubscribe();

    this._unmarkTodayTasksIntervalSub = interval(1000).pipe(
      take(1)
    ).subscribe(() => {
      this.unmarkTodayTasks();
    });
  }

  endUnmarkTodayTasks() {
    this._unmarkTodayTasksIntervalSub && !this._unmarkTodayTasksIntervalSub.closed && this._unmarkTodayTasksIntervalSub.unsubscribe();
  }
}
