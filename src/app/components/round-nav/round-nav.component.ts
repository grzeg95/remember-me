import {Component, signal} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router, RouterLink, RouterLinkActive} from '@angular/router';
import {combineLatest, interval, Subscription} from 'rxjs';
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

  protected readonly _round$ = this._roundsService.round$;
  protected readonly _todayMap$ = this._roundsService.todayMap$;
  protected readonly _today$ = this._roundsService.today$;

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

    combineLatest([
      this._round$,
      this._todayMap$,
      this._today$
    ]).pipe(
      take(1)
    ).subscribe(([round, _todayMap, today]) => {

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
