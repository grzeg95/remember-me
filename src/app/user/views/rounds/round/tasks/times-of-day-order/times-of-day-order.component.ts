import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {Component, OnDestroy, OnInit} from '@angular/core';
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
  styleUrls: ['./times-of-day-order.component.scss']
})
export class TimesOfDayOrderComponent implements OnInit, OnDestroy {

  selectedRound: Round;
  selectedRoundSub: Subscription;

  isOnline: boolean;
  isOnlineSub: Subscription;

  faGripLines = faGripLines;
  RouterDict = RouterDict;

  setTimesOfDayOrderInProgress = false;

  constructor(
    private roundsService: RoundsService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router,
    private connectionService: ConnectionService
  ) {
  }

  ngOnInit(): void {
    this.selectedRoundSub = this.roundsService.selectedRound$.subscribe((round) => this.selectedRound = round);
    this.isOnlineSub = this.connectionService.isOnline$.subscribe((isOnline) => this.isOnline = isOnline);
  }

  ngOnDestroy(): void {
    this.selectedRoundSub.unsubscribe();
    this.isOnlineSub.unsubscribe();
  }

  drop(event: CdkDragDrop<string[]>): void {

    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const timeOfDay = this.selectedRound.timesOfDay[event.previousIndex];
    const moveBy = event.currentIndex - event.previousIndex;

    moveItemInArray(this.selectedRound.timesOfDay, event.previousIndex, event.currentIndex);

    this.setTimesOfDayOrderInProgress = true;
    this.roundsService.setTimesOfDayOrder({
      timeOfDay,
      moveBy,
      roundId: this.roundsService.selectedRound$.value.id
    }).pipe(catchError((error: HTTPError) => {
      this.setTimesOfDayOrderInProgress = false;
      this.snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
      moveItemInArray(this.selectedRound.timesOfDay, event.currentIndex, event.previousIndex);

      return NEVER;
    })).subscribe((success) => {
      this.setTimesOfDayOrderInProgress = false;
      this.snackBar.open(success.details || 'Your operation has been done 😉');
    });
  }

  addNewTask(): void {
    this.router.navigate(['../', RouterDict.taskEditor], {relativeTo: this.route});
  }
}
