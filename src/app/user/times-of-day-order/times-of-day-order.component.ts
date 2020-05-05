import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {Component, OnDestroy, OnInit} from '@angular/core';
import {AngularFireFunctions} from '@angular/fire/functions';
import {MatSnackBar} from '@angular/material/snack-bar';
import {performance} from 'firebase';
import {RouterDict} from 'src/app/app.constants';
import {AuthService} from '../../auth/auth.service';
import {HTTPError, HTTPSuccess} from '../models';
import {UserService} from '../user.service';

@Component({
  selector: 'app-times-of-day-order',
  templateUrl: './times-of-day-order.component.html',
  styleUrls: ['./times-of-day-order.component.sass'],
  host: {class: 'app'}
})
export class TimesOfDayOrderComponent implements OnInit, OnDestroy {

  perf = performance();
  todayOrderComponentTrace = this.perf.trace('TimesOfDayOrderComponent');
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

  disabled = false;

  constructor(private userService: UserService,
              private snackBar: MatSnackBar,
              private fns: AngularFireFunctions,
              private authService: AuthService) {}

  ngOnInit(): void {
    this.todayOrderComponentTrace.start();
    this.userService.runTimesOfDayOrder();
  }

  ngOnDestroy(): void {
    this.todayOrderComponentTrace.stop();
  }

  drop(event: CdkDragDrop<string[]>): void {

    if (event.previousIndex === event.currentIndex) {
      return;
    }

    moveItemInArray(this.timesOfDayOrder, event.previousIndex, event.currentIndex);

    this.disabled = true;

    this.fns.httpsCallable('setTimesOfDayOrder')(this.timesOfDayOrder).subscribe((success: HTTPSuccess) => {
      this.snackBar.open(success.details);
      this.disabled = false;
    }, (error: HTTPError) => {
      if (error.code === 'permission-denied') {
        this.authService.signOut();
        return;
      }
      this.snackBar.open(error.details && typeof error.details === 'string' ? error.details : 'Some went wrong 🤫 Try again 🙂');
      this.disabled = false;
    });

  }

}
