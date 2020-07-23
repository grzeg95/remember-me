import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {Component, OnInit} from '@angular/core';
import {AngularFireFunctions} from '@angular/fire/functions';
import {MatSnackBar} from '@angular/material/snack-bar';
import {faGripLines} from '@fortawesome/free-solid-svg-icons';
import {Subscription} from 'rxjs';
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

  set setTimesOfDayOrder$(setTimesOfDayOrder$: Subscription) {
    this.userService.setTimesOfDayOrder$ = setTimesOfDayOrder$;
  }

  get setTimesOfDayOrder$(): Subscription {
    return this.userService.setTimesOfDayOrder$;
  }

  faGripLines = faGripLines;
  RouterDict = RouterDict;

  get timesOfDayOrder(): string[] {
    return this.userService.timesOfDayOrder;
  }

  get timesOfDayOrderFirstLoading(): boolean {
    return this.userService.timesOfDayOrderFirstLoading;
  }

  get isEmpty(): boolean {
    return this.timesOfDayOrder.length === 0;
  }

  get isConnected(): boolean {
    return this.appService.isConnected$.getValue();
  }

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

    moveItemInArray(this.timesOfDayOrder, event.previousIndex, event.currentIndex);

    this.setTimesOfDayOrder$ = this.fns.httpsCallable('setTimesOfDayOrder')(this.timesOfDayOrder).subscribe((success: HTTPSuccess) => {
      this.snackBar.open(success.details);
    }, (error: HTTPError) => {
      this.snackBar.open(error.details && typeof error.details === 'string' ? error.details : 'Some went wrong 🤫 Try again 🙂');
    });

  }

}
