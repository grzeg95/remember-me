import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {Component, NgZone} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {faGripLines} from '@fortawesome/free-solid-svg-icons';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {RouterDict} from 'src/app/app.constants';
import {AppService} from '../../app-service';
import {UserService} from '../user.service';

@Component({
  selector: 'app-times-of-day-order',
  templateUrl: './times-of-day-order.component.html',
  styleUrls: ['./times-of-day-order.component.scss']
})
export class TimesOfDayOrderComponent {

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

  get timesOfDay$(): BehaviorSubject<string[]> {
    return this.userService.timesOfDay$;
  }

  faGripLines = faGripLines;
  RouterDict = RouterDict;

  constructor(private userService: UserService,
              private snackBar: MatSnackBar,
              private appService: AppService,
              private zone: NgZone) {}

  decodeFirebaseSpecialCharacters(str: string): string {
    return str.decodeFirebaseSpecialCharacters();
  }

  drop(event: CdkDragDrop<string[]>): void {

    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const timesOfDayOrder = this.timesOfDay$.getValue();
    const timeOfDay = timesOfDayOrder[event.previousIndex];
    const moveBy = event.currentIndex - event.previousIndex;

    moveItemInArray(timesOfDayOrder, event.previousIndex, event.currentIndex);

    this.setTimesOfDayOrderSub = this.userService.updateTimesOfDayOrder(timeOfDay, moveBy).subscribe((success) => {
      this.zone.run(() => {
        this.snackBar.open(success.details || 'Your operation has been done 😉');
      });
    }, (error) => {
      this.zone.run(() => {
        this.snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
        moveItemInArray(timesOfDayOrder, event.currentIndex, event.previousIndex);
      });
    });

  }

}
