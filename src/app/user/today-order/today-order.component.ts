import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {Component, OnDestroy, OnInit} from '@angular/core';
import {AngularFireFunctions} from '@angular/fire/functions';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Subscription} from 'rxjs';
import {AppService} from '../../app-service';
import {IError, ISuccess} from '../models';
import {UserService} from '../user.service';

@Component({
  selector: 'app-today-order',
  templateUrl: './today-order.component.html',
  styleUrls: ['./today-order.component.sass'],
  host: { class: 'app' }
})
export class TodayOrderComponent implements OnInit, OnDestroy {

  get order(): string[] {
    return this.userService.timesOfDayOrder;
  }

  set order(newOrder: string[]) {
    this.userService.timesOfDayOrder = newOrder;
  }

  get todayOrderFirstLoading(): boolean {
    return this.userService.todayOrderFirstLoading;
  }

  set todayOrderFirstLoading(value: boolean) {
    this.userService.todayOrderFirstLoading = value;
  }

  get isEmpty(): boolean {
    return this._isEmpty;
  }

  _isEmpty: boolean;
  disabled = false;
  timesOfDayOrder$: Subscription;
  isConnected$: Subscription;

  constructor(private userService: UserService,
              private snackBar: MatSnackBar,
              private fns: AngularFireFunctions,
              private appService: AppService) {
    this.updateIsEmpty();
  }

  ngOnInit(): void {
    this.isConnected$ = this.appService.isConnected$.subscribe((isConnected) => {
      if (isConnected) {
        this.refreshTimesOfDayOrder();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timesOfDayOrder$ && !this.timesOfDayOrder$.closed) {
      this.timesOfDayOrder$.unsubscribe();
    }

    this.isConnected$.unsubscribe();
  }

  updateIsEmpty(): void {
    this._isEmpty = this.order.length === 0;
  }

  refreshTimesOfDayOrder(): void {
    if (this.timesOfDayOrder$ && !this.timesOfDayOrder$.closed) {
      this.timesOfDayOrder$.unsubscribe();
    }

    this.timesOfDayOrder$ = this.userService.getTimesOfDayOrder$().subscribe((timesOfDayOrder: string[]) => {
      this.order = timesOfDayOrder;
      this.todayOrderFirstLoading = false;
      this.updateIsEmpty();
    });
  }

  drop(event: CdkDragDrop<string[]>): void {

    if (event.previousIndex === event.currentIndex) {
      return;
    }

    moveItemInArray(this.order, event.previousIndex, event.currentIndex);

    this.disabled = true;

    this.fns.httpsCallable('setTodayOrder')(this.order).subscribe((success: ISuccess) => {
      this.snackBar.open(success.details);
      this.disabled = false;
    }, (error: IError) => {
      this.snackBar.open(error.details && typeof error.details === 'string' ? error.details : 'Some went wrong 🤫 Try again 🙂');
      this.disabled = false;
      this.refreshTimesOfDayOrder();
    });

  }

}
