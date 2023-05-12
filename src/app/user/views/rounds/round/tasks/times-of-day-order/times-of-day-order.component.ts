import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {ChangeDetectionStrategy, Component, OnDestroy, OnInit, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';
import {faGripLines} from '@fortawesome/free-solid-svg-icons';
import {catchError, NEVER, Subscription} from 'rxjs';
import {ConnectionService} from 'services';
import {RouterDict} from 'src/app/app.constants';
import {HTTPError, Round} from '../../../../../models';
import {RoundsService} from '../../../rounds.service';

@Component({
  selector: 'app-times-of-day-order',
  templateUrl: './times-of-day-order.component.html',
  styleUrls: ['./times-of-day-order.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimesOfDayOrderComponent implements OnInit, OnDestroy {

  selectedRoundSub: Subscription;
  selectedRound = signal<Round>(null);
  isOnline = toSignal(this.connectionService.isOnline$);

  faGripLines = faGripLines;
  RouterDict = RouterDict;

  setTimesOfDayOrderInProgress = signal(false);

  constructor(
    private roundsService: RoundsService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router,
    private connectionService: ConnectionService
  ) {
  }

  ngOnInit(): void {
    this.selectedRoundSub = this.roundsService.selectedRound$.subscribe((round) => {
      this.selectedRound.set(round);
    });
  }

  ngOnDestroy(): void {
    this.selectedRoundSub.unsubscribe();
  }

  drop(event: CdkDragDrop<string[]>): void {

    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const selectedRound = this.selectedRound();
    const timeOfDay = selectedRound.timesOfDay[event.previousIndex];
    const moveBy = event.currentIndex - event.previousIndex;

    moveItemInArray(selectedRound.timesOfDay, event.previousIndex, event.currentIndex);
    this.selectedRound.set(selectedRound);

    this.setTimesOfDayOrderInProgress.set(true);
    this.roundsService.setTimesOfDayOrder({
      timeOfDay,
      moveBy,
      roundId: this.roundsService.selectedRound$.value.id
    }).pipe(catchError((error: HTTPError) => {
      this.setTimesOfDayOrderInProgress.set(false);
      this.snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
      moveItemInArray(selectedRound.timesOfDay, event.currentIndex, event.previousIndex);
      this.selectedRound.set(selectedRound);

      return NEVER;
    })).subscribe((success) => {
      this.setTimesOfDayOrderInProgress.set(false);
      this.snackBar.open(success.details || 'Your operation has been done 😉');
    });
  }

  addNewTask(): void {
    this.router.navigate(['../', RouterDict.taskEditor], {relativeTo: this.route});
  }
}
