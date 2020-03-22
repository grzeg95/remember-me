import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {Component, OnDestroy, OnInit} from '@angular/core';
import {AngularFireFunctions} from '@angular/fire/functions';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Subscription} from 'rxjs';
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

  disabled = false;
  timesOfDayOrder$: Subscription;
  isEmpty = true;

  constructor(private userService: UserService,
              private snackBar: MatSnackBar,
              private fns: AngularFireFunctions) {}

  ngOnInit(): void {

    if (this.order.length !== 0) {
      this.isEmpty = false;
    }

    this.refreshTimesOfDayOrder();

  }

  ngOnDestroy(): void {
    if (this.timesOfDayOrder$ && !this.timesOfDayOrder$.closed) {
      this.timesOfDayOrder$.unsubscribe();
    }
  }

  refreshTimesOfDayOrder(): void {
    if (this.timesOfDayOrder$ && !this.timesOfDayOrder$.closed) {
      this.timesOfDayOrder$.unsubscribe();
    }

    this.timesOfDayOrder$ = this.userService.getTimesOfDayOrder$().subscribe((timesOfDayOrder: string[]) => {
      this.order = timesOfDayOrder;
      this.timesOfDayOrder$.unsubscribe();
      this.todayOrderFirstLoading = false;
      this.isEmpty = timesOfDayOrder.length === 0;
    });
  }

  drop(event: CdkDragDrop<string[]>): void {

    if (event.previousIndex === event.currentIndex) {
      return;
    }

    moveItemInArray(this.order, event.previousIndex, event.currentIndex);

    this.disabled = true;

    this.fns.httpsCallable('setTodayOrder')(this.order).subscribe(() => {
      console.log('OK');
      this.snackBar.open('Order has been updated');
      this.disabled = false;
      this.refreshTimesOfDayOrder();
    }, (error) => {
      console.log(error);
      this.snackBar.open('Error on order update');
      this.disabled = false;
      this.refreshTimesOfDayOrder();
    });

  }

}
