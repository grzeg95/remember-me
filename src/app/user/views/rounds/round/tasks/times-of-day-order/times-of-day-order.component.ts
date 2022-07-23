import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { faGripLines } from '@fortawesome/free-solid-svg-icons';
import { RouterDict } from 'src/app/app.constants';
import { ConnectionService } from "../../../../../../connection.service";
import { RoundService } from '../../round.service';
import { RoundsService } from '../../../rounds.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Round } from 'firebase-functions/src/helpers/models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-times-of-day-order',
  templateUrl: './times-of-day-order.component.html',
  styleUrls: ['./times-of-day-order.component.scss']
})
export class TimesOfDayOrderComponent implements OnInit, OnDestroy {

  get setTimesOfDayOrderSub() {
    return this.roundService.setTimesOfDayOrderSub;
  }

  roundSelected: Round;
  roundSelectedSub: Subscription;

  isOnline: boolean;
  isOnlineSub: Subscription;

  faGripLines = faGripLines;
  RouterDict = RouterDict;

  constructor(
    private roundService: RoundService,
    private roundsService: RoundsService,
    private snackBar: MatSnackBar,
    private zone: NgZone,
    private route: ActivatedRoute,
    private router: Router,
    private connectionService: ConnectionService
  ) {
  }

  ngOnInit(): void {
    this.roundSelectedSub = this.roundsService.roundSelected$.subscribe((round) => this.roundSelected = round);
    this.isOnlineSub = this.connectionService.isOnline$.subscribe((isOnline) => this.isOnline = isOnline);
  }

  ngOnDestroy(): void {
    this.roundSelectedSub.unsubscribe();
    this.isOnlineSub.unsubscribe();
  }

  drop(event: CdkDragDrop<string[]>): void {

    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const timeOfDay = this.roundSelected.timesOfDay[event.previousIndex];
    const moveBy = event.currentIndex - event.previousIndex;

    moveItemInArray(this.roundSelected.timesOfDay, event.previousIndex, event.currentIndex);

    this.roundService.setTimesOfDayOrderSub = this.roundService.updateTimesOfDayOrder({
      timeOfDay,
      moveBy,
      roundId: this.roundsService.roundSelected$.value.id
    }).subscribe((success) => {
      this.zone.run(() => {
        this.snackBar.open(success.details || 'Your operation has been done 😉');
      });
    }, (error) => {
      this.zone.run(() => {
        this.snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
        moveItemInArray(this.roundSelected.timesOfDay, event.currentIndex, event.previousIndex);
      });
    });

  }

  addNewTask(): void {
    this.router.navigate(['../', RouterDict.taskEditor], {relativeTo: this.route});
  }
}
