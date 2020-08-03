import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {Component, OnDestroy, OnInit} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {faGripLines} from '@fortawesome/free-solid-svg-icons';
import {Observable, Subscription} from 'rxjs';
import {RouterDict} from 'src/app/app.constants';
import {AppService} from '../../app-service';
import {TimeOfDay} from '../models';
import {UserService} from '../user.service';

@Component({
  selector: 'app-times-of-day-order',
  templateUrl: './times-of-day-order.component.html',
  styleUrls: ['./times-of-day-order.component.sass'],
  host: {class: 'app'}
})
export class TimesOfDayOrderComponent implements OnInit, OnDestroy {

  set setTimesOfDayOrderSub(setTimesOfDayOrderSub: Subscription) {
    this.userService.setTimesOfDayOrderSub = setTimesOfDayOrderSub;
  }

  get setTimesOfDayOrderSub(): Subscription {
    return this.userService.setTimesOfDayOrderSub;
  }

  get timesOfDayOrderFirstLoading$(): Observable<boolean> {
    return this.userService.timesOfDayOrderFirstLoading$;
  }

  get isConnected$(): Observable<boolean> {
    return this.appService.isConnected$;
  }

  faGripLines = faGripLines;
  RouterDict = RouterDict;
  timesOfDayOrder: TimeOfDay[] = [];
  timesOfDayOrderSub: Subscription;

  constructor(private userService: UserService,
              private snackBar: MatSnackBar,
              private appService: AppService) {}

  ngOnInit(): void {
    this.userService.runTimesOfDayOrder();
    this.timesOfDayOrderSub = this.userService.timesOfDayOrder$
      .subscribe((timesOfDayOrder) => this.timesOfDayOrder = timesOfDayOrder);
  }

  ngOnDestroy(): void {
    this.timesOfDayOrderSub.unsubscribe();
  }

  drop(event: CdkDragDrop<TimeOfDay[]>): void {

    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const prev = this.timesOfDayOrder[event.previousIndex].id;
    const curr = this.timesOfDayOrder[event.currentIndex].id;

    moveItemInArray(this.timesOfDayOrder, event.previousIndex, event.currentIndex);

    this.setTimesOfDayOrderSub = this.userService.updateTimesOfDayOrder(event.currentIndex - event.previousIndex, curr, prev).subscribe((success) => {
      this.snackBar.open(success.details);
    }, (error) => {
      this.snackBar.open(error.details);
    });

  }

}
