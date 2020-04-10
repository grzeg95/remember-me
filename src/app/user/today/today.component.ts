import {AfterViewChecked, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {AngularFirestore} from '@angular/fire/firestore';
import {MatSnackBar} from '@angular/material/snack-bar';
import {interval, Subscription} from 'rxjs';
import {AppService} from '../../app-service';
import {AuthService} from '../../auth/auth.service';
import {ITodayItem} from '../models';
import {UserService} from '../user.service';

@Component({
  selector: 'app-today',
  templateUrl: './today.component.html',
  styleUrls: ['./today.component.sass'],
  host: { class: 'app' }
})
export class TodayComponent implements OnInit, AfterViewChecked, OnDestroy {

  get order(): string[] {
    return this.userService.timesOfDayOrder;
  }

  set order(newOrder: string[]) {
    this.userService.timesOfDayOrder = newOrder;
  }

  get todayItemsFirstLoading(): boolean {
    return this.userService.todayItemsFirstLoading;
  }

  get todayItems(): {[timeOfDay: string]: ITodayItem[]} {
    return this.userService.todayItems;
  }

  set todayItems(newTodayItems: {[timeOfDay: string]: ITodayItem[]}) {
    this.userService.todayItems = newTodayItems;
  }

  get isEmpty(): boolean {
    return Object.entries(this.todayItems).length === 0 || this.order.length === 0;
  }

  get todayItemsView(): {timeOfDay: string, tasks: ITodayItem[]}[] {

    return this.order.filter((timeOfDay) => this.todayItems[timeOfDay]).map((timeOfDay) => ({
      timeOfDay,
      tasks: this.todayItems[timeOfDay]
    }));

  }

  constructor(private afs: AngularFirestore,
              private cdRef: ChangeDetectorRef,
              private authService: AuthService,
              private userService: UserService,
              private snackBar: MatSnackBar,
              private appService: AppService) {}

  todayName = '';
  todayTasks$: Subscription;
  timesOfDayOrder$: Subscription;
  changeDayInterval: Subscription;
  isConnected$: Subscription;
  destroyed = false;

  ngOnInit(): void {

    this.isConnected$ = this.appService.isConnected$.subscribe((isConnected) => {
      if (isConnected) {
        this.changeDay();
      }
    });

    this.getTimesOfDayOrder();

  }

  todayItemIsDone(timeOfDay: string): boolean {
    return !this.todayItems[timeOfDay].some((task) => !task.done);
  }

  trackByTodayItems(index: number, item: {timeOfDay: string, tasks: ITodayItem[]}): string {
    return index + item.timeOfDay;
  }

  trackByTodayItem(index: number, item: ITodayItem): string {
    return index + ('' + item.done) + item.description;
  }

  getTimesOfDayOrder(): void {
    if (this.timesOfDayOrder$ && !this.timesOfDayOrder$.closed) {
      this.timesOfDayOrder$.unsubscribe();
    }

    this.timesOfDayOrder$ = this.userService.getTimesOfDayOrder$().subscribe((timesOfDayOrder) =>
      this.order = timesOfDayOrder
    );
  }

  getTodayTasksList(): void {
    this.todayName = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];

    if (this.todayTasks$ && !this.todayTasks$.closed) {
      this.todayTasks$.unsubscribe();
    }

    this.todayTasks$ = this.userService.getTodayTasks$(this.todayName).subscribe((newTodayItems) =>
      this.todayItems = newTodayItems
    );
  }

  changeDay(): void {
    this.getTodayTasksList();
    this.getTimesOfDayOrder();

    const now = new Date();
    const todayPast: number = now.getSeconds() + (now.getMinutes() * 60) + (now.getHours() * 60 * 60);
    const toNextDay = 86400 - todayPast * 1000;

    if (this.changeDayInterval && !this.changeDayInterval.closed) {
      this.changeDayInterval.unsubscribe();
    }

    this.changeDayInterval = interval(toNextDay).subscribe(() => this.changeDay());
  }

  ngAfterViewChecked(): void {
    this.cdRef.detectChanges();
  }

  setProgress(checkbox: HTMLInputElement, event: Event, taskId: string, timeOfDay: string): void {

    event.preventDefault();

    if (checkbox.disabled) {
      return;
    }

    checkbox.disabled = true;

    const toMerge = JSON.parse(`{"timesOfDay": {"${timeOfDay}": ${!checkbox.checked}}}`);
    console.log(toMerge);

    this.afs.doc(`/users/${this.authService.userData.uid}/today/${this.todayName}/task/${taskId}`).set(toMerge, {merge: true}).then(() => {
      console.log('updated');
      checkbox.checked = !checkbox.checked;
      checkbox.disabled = false;
      this.todayItems[timeOfDay].find((task) => task.id === taskId).done = checkbox.checked;
    }).catch((error) => {
      if (!this.destroyed) {
        console.log(error);
        checkbox.disabled = false;
        this.snackBar.open('Some went wrong 🤫 Try again 🙂');
        this.changeDay();
      }
    });

  }

  ngOnDestroy(): void {
    this.changeDayInterval.unsubscribe();

    if (this.todayTasks$ && !this.todayTasks$.closed) {
      this.todayTasks$.unsubscribe();
    }

    if (this.timesOfDayOrder$ && !this.timesOfDayOrder$.closed) {
      this.timesOfDayOrder$.unsubscribe();
    }

    this.isConnected$.unsubscribe();

    this.destroyed = true;
  }

}
