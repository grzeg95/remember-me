import {AfterViewChecked, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {AngularFireFunctions} from '@angular/fire/functions';
import {MatSnackBar} from '@angular/material/snack-bar';
import {interval, Subscription} from 'rxjs';
import {take} from 'rxjs/operators';
import {AppService} from '../../app-service';
import {AuthService} from '../../auth/auth.service';
import {IError, ITodayItem} from '../models';
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

  set todayItemsFirstLoading(value: boolean) {
    this.userService.todayItemsFirstLoading = value;
  }

  get todayItems(): {[timeOfDay: string]: ITodayItem[]} {
    return this.userService.todayItems;
  }

  set todayItems(newTodayItems: {[timeOfDay: string]: ITodayItem[]}) {
    this.userService.todayItems = newTodayItems;
  }

  get todayItemsView(): {timeOfDay: string, tasks: ITodayItem[]}[] {

    const todayItemsViewContainer = [];

    this.order.forEach((timeOfDay) => {
      if (this.todayItems[timeOfDay]) {
        todayItemsViewContainer.push({
          timeOfDay,
          tasks: this.todayItems[timeOfDay]
        });
      }
    });

    this.isEmpty = Object.keys(todayItemsViewContainer).length === 0;

    return todayItemsViewContainer;
  }

  constructor(private fns: AngularFireFunctions,
              private cdRef: ChangeDetectorRef,
              private authService: AuthService,
              private userService: UserService,
              private snackBar: MatSnackBar,
              private appService: AppService) {}

  todayName = '';
  todayTasks$: Subscription;
  timesOfDayOrder$: Subscription;
  changeDayInterval: Subscription;
  setProgressSubsActiveConnections = 0;
  isEmpty = true;
  isConnected$: Subscription;

  ngOnInit(): void {

    if (Object.entries(this.todayItems).length !== 0 && this.todayItems.constructor === Object) {
      this.isEmpty = false;
    }

    this.isConnected$ = this.appService.isConnected$.subscribe((isConnected) => {
      if (isConnected) {
        this.changeDay();
      }
    });

    this.observeTimesOfDayOrder();

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

  observeTimesOfDayOrder(): void {
    if (!this.timesOfDayOrder$ || this.timesOfDayOrder$.closed) {
      this.timesOfDayOrder$ = this.userService.getTimesOfDayOrder$().subscribe((timesOfDayOrder: string[]) => {
        this.order = timesOfDayOrder;
      });
    }
  }

  private updateTodayTaskList(): void {
    this.todayTasks$ = this.userService.getTodayTasks$(this.todayName).subscribe((newTodayItems) => {
      this.todayItems = newTodayItems;
      this.todayItemsFirstLoading = false;
    });
  }

  observeTodayTasksList(): void {

    const now = new Date();
    const lastTodayName = this.todayName + '';
    this.todayName = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];

    if (lastTodayName !== this.todayName) {
      if (this.todayTasks$ && !this.todayTasks$.closed) {
        this.todayTasks$.unsubscribe();
      }
      this.updateTodayTaskList();
    } else if (!this.todayTasks$ || this.todayTasks$.closed) {
      this.updateTodayTaskList();
    }

  }

  changeDay(): void {
    this.observeTodayTasksList();
    this.observeTimesOfDayOrder();
    this.changeDayInterval = interval(TodayComponent.toNextDayCalc() * 1000).pipe(take(1)).subscribe(() => this.changeDay());
  }

  ngAfterViewChecked(): void {
    this.cdRef.detectChanges();
  }

  setProgress(checkbox: HTMLInputElement, event: Event, taskId: string, timeOfDay: string): void {

    event.preventDefault();

    const toUpdateOneTimeOfDay = {
      taskId,
      timeOfDay,
      checked: !checkbox.checked,
      todayName: this.todayName
    };

    checkbox.disabled = true;

    this.setProgressSubsActiveConnections++;

    this.fns.httpsCallable('setProgress')(toUpdateOneTimeOfDay).subscribe(() => {
      checkbox.checked = toUpdateOneTimeOfDay.checked;
      checkbox.disabled = false;
      this.setProgressSubsActiveConnections--;

      this.todayItems[timeOfDay].find((task) => task.id === taskId).done = toUpdateOneTimeOfDay.checked;

      if (this.setProgressSubsActiveConnections === 0) {
        console.log('all setProgressSubsActiveConnections done');
        this.changeDay();
      } else {
        console.log('complete with active others: ' + this.setProgressSubsActiveConnections);
      }

    }, (error: IError) => {
      checkbox.disabled = false;
      this.setProgressSubsActiveConnections--;
      this.snackBar.open(error.details && typeof error.details === 'string' ? error.details : 'Some went wrong 🤫 Try again 🙂');
      if (this.setProgressSubsActiveConnections === 0) {
        console.log('all setProgressSubsActiveConnections done');
        this.changeDay();
      } else if (error) {
        console.log(error);
      } else { // complete with active others
        console.log('complete with active others: ' + this.setProgressSubsActiveConnections);
      }
    });

    if (this.timesOfDayOrder$ && !this.timesOfDayOrder$.closed) {
      this.timesOfDayOrder$.unsubscribe();
    }

    if (this.todayTasks$ && !this.todayTasks$.closed) {
      this.todayTasks$.unsubscribe();
    }

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
  }

  private static toNextDayCalc(): number {
    const now = new Date();
    const todayPast: number = now.getSeconds() + (now.getMinutes() * 60) + (now.getHours() * 60 * 60);
    return 86400 - todayPast;
  }

}
