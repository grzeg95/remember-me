import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {Component, OnInit} from '@angular/core';
import {AngularFireFunctions} from '@angular/fire/functions';
import {MatSnackBar} from '@angular/material/snack-bar';
import {faGripLines} from '@fortawesome/free-solid-svg-icons';
import {Observable, Subscription} from 'rxjs';
import {RouterDict} from 'src/app/app.constants';
import {AppService} from '../../app-service';
import {HTTPError, HTTPSuccess} from '../models';
import {UserService} from '../user.service';

@Component({
  selector: 'app-times-of-day-order',
  templateUrl: './times-of-day-order.component.html',
  styleUrls: ['./times-of-day-order.component.sass'],
  host: {class: 'app'}
})
export class TimesOfDayOrderComponent implements OnInit {

  set setTimesOfDayOrderSub(setTimesOfDayOrderSub: Subscription) {
    this.userService.setTimesOfDayOrderSub = setTimesOfDayOrderSub;
  }

  get setTimesOfDayOrderSub(): Subscription {
    return this.userService.setTimesOfDayOrderSub;
  }

  get timesOfDayOrder$(): Observable<string[]> {
    return this.userService.timesOfDayOrder$;
  }

  get timesOfDayOrderFirstLoading$(): Observable<boolean> {
    return this.userService.timesOfDayOrderFirstLoading$;
  }

  get isConnected$(): Observable<boolean> {
    return this.appService.isConnected$;
  }

  faGripLines = faGripLines;
  RouterDict = RouterDict;

  constructor(private userService: UserService,
              private snackBar: MatSnackBar,
              private fns: AngularFireFunctions,
              private appService: AppService) {}

  ngOnInit(): void {
    this.userService.runTimesOfDayOrder();
  }

  drop(event: CdkDragDrop<string[]>): void {

    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const timesOfDayOrder = [...this.userService.timesOfDayOrder.getValue()];
    moveItemInArray(timesOfDayOrder, event.previousIndex, event.currentIndex);
    this.userService.timesOfDayOrder.next(timesOfDayOrder);

    this.setTimesOfDayOrderSub = this.fns.httpsCallable('setTimesOfDayOrder')(timesOfDayOrder).subscribe((success: HTTPSuccess) => {
      this.snackBar.open(success.details);
    }, (error: HTTPError) => {
      this.snackBar.open(error.details && typeof error.details === 'string' ? error.details : 'Some went wrong 🤫 Try again 🙂');
    });

  }

}
