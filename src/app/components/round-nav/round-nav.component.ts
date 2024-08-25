import {NgForOf} from '@angular/common';
import {Component, signal} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router, RouterLink, RouterLinkActive} from '@angular/router';
import {interval, Subscription} from 'rxjs';
import {take} from 'rxjs/operators';
import {RouterDict} from '../../app.constants';
import {HTTPSuccess} from '../../models/models';
import {AuthService} from '../../services/auth.service';
import {FunctionsService} from '../../services/functions.service';
import {RoundsService} from '../../services/rounds.service';

@Component({
  selector: 'app-round-nav',
  standalone: true,
  templateUrl: './round-nav.component.html',
  imports: [
    NgForOf,
    RouterLink,
    RouterLinkActive
  ],
  styleUrls: ['./round-nav.component.scss']
})
export class RoundNavComponent {

  protected readonly _RouterDict = RouterDict;

  private _unmarkTodayTasksIntervalSub: Subscription | undefined;

  protected readonly _user = this._authService.userSig.get();

  protected readonly _round = this._roundsService.roundSig.get();
  protected readonly _todayMap = this._roundsService.todayMapSig.get();
  protected readonly _today = this._roundsService.todaySig.get();

  protected readonly _todayTasksViewActive = signal(false);

  constructor(
    private readonly _authService: AuthService,
    private readonly _roundsService: RoundsService,
    private readonly _functionsService: FunctionsService,
    private readonly _activatedRoute: ActivatedRoute,
    private readonly _router: Router,
    private readonly _matSnackBar: MatSnackBar
  ) {

    this._activatedRoute.url.subscribe(() => {
      this._todayTasksViewActive.set(this._router.url.indexOf('/' + this._RouterDict.todayTasks) > -1);
    });
  }

  unmarkTodayTasks() {

    const round = this._round();
    const _todayMap = this._todayMap();
    const today = this._today();

    if (!round || !_todayMap || !today) {
      return;
    }

    const todayId = _todayMap.get(today.short)?.id;

    if (!todayId) {
      return;
    }

    this._matSnackBar.open('Unmarking today tasks 👀');

    this._functionsService.httpsCallable<{
      roundId: string,
      todayId: string
    }, HTTPSuccess>('rounds-unmarktodaytasks', {
      roundId: round.id,
      todayId
    }).subscribe((success) => {
      this._matSnackBar.open(success.details);
    });
  }

  mouseDown() {

    this._unmarkTodayTasksIntervalSub && !this._unmarkTodayTasksIntervalSub.closed && this._unmarkTodayTasksIntervalSub.unsubscribe();

    this._unmarkTodayTasksIntervalSub = interval(1000).pipe(
      take(1)
    ).subscribe(() => {
      this.unmarkTodayTasks();
    });
  }

  mouseUp() {
    this._unmarkTodayTasksIntervalSub && !this._unmarkTodayTasksIntervalSub.closed && this._unmarkTodayTasksIntervalSub.unsubscribe();
  }
}
