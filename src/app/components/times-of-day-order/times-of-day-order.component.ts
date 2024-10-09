import {CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray} from '@angular/cdk/drag-drop';
import {NgClass, NgTemplateOutlet} from '@angular/common';
import {Component, signal, ViewEncapsulation} from '@angular/core';
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
import {ButtonComponent} from '../button/button.component';
import {SkeletonComponent} from '../skeleton/skeleton.component';

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
    NgTemplateOutlet,
    SkeletonComponent,
    ButtonComponent,
  ],
  styleUrls: ['./times-of-day-order.component.scss'],
  animations: [
    fadeZoomInOutTrigger
  ],
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'app-times-of-day-order'
  }
})
export class TimesOfDayOrderComponent {

  protected readonly _round = this._roundsService.roundSig.get();
  protected readonly _loadingRound = this._roundsService.loadingRoundSig.get();
  protected readonly _isOnline = this._connectionService.isOnlineSig.get();
  protected readonly _isLoading = signal<boolean>(false);

  protected readonly _faGripLines = faGripLines;
  protected readonly _RouterDict = RouterDict;

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
    this._roundsService.roundSig.update((currRound) => {
      if (currRound) {
        return {
          ...currRound,
          timesOfDay: order,
        };
      }

      return undefined;
    });

    this._isLoading.set(true);
    this._roundsService.setTimesOfDayOrder({
      timeOfDay,
      moveBy,
      roundId: this._round()!.id
    }).pipe(catchError((error) => {
      this._isLoading.set(false);
      this._snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
      moveItemInArray(order, event.currentIndex, event.previousIndex);
      this._roundsService.roundSig.update((currRound) => {
        if (currRound) {
          return {
            ...currRound,
            timesOfDay: order,
          };
        }

        return undefined;
      });
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
