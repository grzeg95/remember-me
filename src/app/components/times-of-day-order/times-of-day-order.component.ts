import {CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray} from '@angular/cdk/drag-drop';
import {NgClass, NgTemplateOutlet} from '@angular/common';
import {Component, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {MatButtonModule} from '@angular/material/button';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faGripLines} from '@fortawesome/free-solid-svg-icons';
import {catchError, NEVER} from 'rxjs';
import {fadeZoomInOutTrigger} from '../../animations/fade-zoom-in-out.trigger';
import {RouterDict} from '../../app.constants';
import {ConnectionService} from '../../services/connection.service';
import {RoundsService} from '../../services/rounds.service';

@Component({
  selector: 'app-times-of-day-order',
  standalone: true,
  templateUrl: './times-of-day-order.component.html',
  imports: [
    NgClass,
    MatButtonModule,
    MatProgressBarModule,
    CdkDropList,
    MatProgressSpinnerModule,
    FontAwesomeModule,
    CdkDrag,
    NgTemplateOutlet
  ],
  styleUrls: ['./times-of-day-order.component.scss'],
  animations: [
    fadeZoomInOutTrigger
  ]
})
export class TimesOfDayOrderComponent {

  protected readonly _round = toSignal(this._roundsService.round$);
  protected readonly _loadingRound = toSignal(this._roundsService.loadingRound$);
  protected readonly _isOnline = toSignal(this._connectionService.isOnline$);
  protected readonly _isLoading = signal<boolean>(false);

  protected readonly _faGripLines = faGripLines;

  constructor(
    private readonly _roundsService: RoundsService,
    private readonly _snackBar: MatSnackBar,
    private readonly _route: ActivatedRoute,
    private readonly _router: Router,
    private readonly _connectionService: ConnectionService
  ) {
  }

  drop(event: CdkDragDrop<string[]>): void {

    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const order = this._round()!.timesOfDay;
    const timeOfDay = order[event.previousIndex];
    const moveBy = event.currentIndex - event.previousIndex;

    moveItemInArray(order, event.previousIndex, event.currentIndex);

    const currRound = this._roundsService.round$.value;
    if (currRound) {
      this._roundsService.round$.next({
        ...currRound,
        timesOfDay: order
      })
    }

    this._isLoading.set(true);
    this._roundsService.setTimesOfDayOrder({
      timeOfDay,
      moveBy,
      roundId: this._round()!.id
    }).pipe(catchError((error) => {
      this._isLoading.set(false);
      this._snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
      moveItemInArray(order, event.currentIndex, event.previousIndex);

      const currRound = this._roundsService.round$.value;
      if (currRound) {
        this._roundsService.round$.next({
          ...currRound,
          timesOfDay: order
        })
      }

      return NEVER;
    })).subscribe((success) => {
      this._isLoading.set(false);
      this._snackBar.open(success.details || 'Your operation has been done 😉');
    });
  }

  addNewTask(): void {
    this._router.navigate(['../', RouterDict.taskEditor], {relativeTo: this._route});
  }
}
