import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {Component, OnDestroy, OnInit} from '@angular/core';
import {AngularFireFunctions} from '@angular/fire/functions';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Subscription} from 'rxjs';
import {IUser} from '../../auth/i-user';
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
  userSubscription: Subscription = new Subscription();
  isEmpty = true;

  constructor(private userService: UserService,
              private snackBar: MatSnackBar,
              private fns: AngularFireFunctions) {}

  ngOnInit(): void {

    if (this.order.length !== 0) {
      this.isEmpty = false;
      this.todayOrderFirstLoading = false;
    }

    this.userSubscription = this.userService.user$.subscribe((user: IUser) => {
      if (user.timesOfDay) {
        this.userService.prepareSort(user.timesOfDay);
        this.todayOrderFirstLoading = false;
        this.isEmpty = this.order.length === 0;
      }
    });

  }

  ngOnDestroy(): void {
    this.userSubscription.unsubscribe();
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
    }, (error) => {
      console.log(error);
      this.snackBar.open('Error on order update');
      this.disabled = false;
    });

  }

}
