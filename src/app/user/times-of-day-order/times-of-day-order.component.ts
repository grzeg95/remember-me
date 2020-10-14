import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {Component, NgZone, OnInit} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {faGripLines} from '@fortawesome/free-solid-svg-icons';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {RouterDict} from 'src/app/app.constants';
import {AppService} from '../../app-service';
import {TimeOfDay} from '../models';
import {UserService} from '../user.service';

@Component({
  selector: 'app-times-of-day-order',
  templateUrl: './times-of-day-order.component.html',
  styleUrls: ['./times-of-day-order.component.scss']
})
export class TimesOfDayOrderComponent implements OnInit {

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

  get timesOfDayOrder$(): BehaviorSubject<TimeOfDay[]> {
    return this.userService.timesOfDayOrder$;
  }

  faGripLines = faGripLines;
  RouterDict = RouterDict;

  constructor(private userService: UserService,
              private snackBar: MatSnackBar,
              private appService: AppService,
              private zone: NgZone) {}

  ngOnInit(): void {
    this.userService.runTimesOfDayOrder();
  }

  decodeFirebaseSpecialCharacters(str: string): string {
    return str.decodeFirebaseSpecialCharacters();
  }

  drop(event: CdkDragDrop<TimeOfDay[]>): void {

    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const timesOfDayOrder = this.timesOfDayOrder$.getValue();
    const curr = timesOfDayOrder[event.previousIndex].id;
    const prev = timesOfDayOrder[event.currentIndex].id;
    const dir = (event.currentIndex - event.previousIndex) / Math.abs(event.currentIndex - event.previousIndex);

    moveItemInArray(timesOfDayOrder, event.previousIndex, event.currentIndex);

    this.setTimesOfDayOrderSub = this.userService.updateTimesOfDayOrder(dir, curr, prev).subscribe((success) => {
      this.zone.run(() => {
        this.snackBar.open(success.details || 'Your operation has been done 😉');
      });
    }, (error) => {
      this.zone.run(() => {
        this.snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
      });
    });

  }

}
