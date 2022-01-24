import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {Component, NgZone} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {faGripLines} from '@fortawesome/free-solid-svg-icons';
import {Observable, Subscription} from 'rxjs';
import {RouterDict} from 'src/app/app.constants';
import {AppService} from '../../../../../../app-service';
import {Round} from '../../../../../models';
import {RoundService} from '../../round.service';
import {RoundsService} from '../../../rounds.service';
import {ActivatedRoute, Router} from '@angular/router';

@Component({
  selector: 'app-times-of-day-order',
  templateUrl: './times-of-day-order.component.html',
  styleUrls: ['./times-of-day-order.component.scss']
})
export class TimesOfDayOrderComponent {

  set setTimesOfDayOrderSub(setTimesOfDayOrderSub: Subscription) {
    this.roundService.setTimesOfDayOrderSub = setTimesOfDayOrderSub;
  }

  get setTimesOfDayOrderSub(): Subscription {
    return this.roundService.setTimesOfDayOrderSub;
  }

  get roundsOrderFirstLoading$(): Observable<boolean> {
    return this.roundService.roundsOrderFirstLoading$;
  }

  get isOnline$(): Observable<boolean> {
    return this.appService.isOnline$;
  }

  get roundSelected(): Round {
    return this.roundsService.roundSelected$.value;
  }

  faGripLines = faGripLines;
  RouterDict = RouterDict;

  constructor(private roundService: RoundService,
              private roundsService: RoundsService,
              private snackBar: MatSnackBar,
              private appService: AppService,
              private zone: NgZone,
              private route: ActivatedRoute,
              private router: Router) {}

  drop(event: CdkDragDrop<string[]>): void {

    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const roundSelected = this.roundSelected;

    const timesOfDayEncrypted = roundSelected.timesOfDayEncrypted;
    const timeOfDay = roundSelected.timesOfDay[event.previousIndex];
    const moveBy = event.currentIndex - event.previousIndex;

    moveItemInArray(timesOfDayEncrypted, event.previousIndex, event.currentIndex);
    moveItemInArray(roundSelected.timesOfDay, event.previousIndex, event.currentIndex);

    this.setTimesOfDayOrderSub = this.roundService.updateTimesOfDayOrder({timeOfDay, moveBy, roundId: this.roundsService.roundSelected$.value.id}).subscribe((success) => {
      this.zone.run(() => {
        this.snackBar.open(success.details || 'Your operation has been done 😉');
      });
    }, (error) => {
      this.zone.run(() => {
        this.snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
        moveItemInArray(timesOfDayEncrypted, event.currentIndex, event.previousIndex);
        moveItemInArray(roundSelected.timesOfDay, event.currentIndex, event.previousIndex);
      });
    });

  }

  addNewTask(): void {
    this.router.navigate(['../', RouterDict.taskEditor], {relativeTo: this.route});
  }
}
