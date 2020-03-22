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

  get isEmpty(): boolean {
    return Object.entries(this.todayItems).length === 0 || this.order.length === 0;
  }

  get todayItemsView(): {timeOfDay: string, tasks: ITodayItem[]}[] {

    return this.order.filter((timeOfDay) => this.todayItems[timeOfDay]).map((timeOfDay) => ({
      timeOfDay,
      tasks: this.todayItems[timeOfDay]
    }));

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
  setProgress$: Subscription = new Subscription();
  changeDayInterval: Subscription;
  setProgressSubsActiveConnections = 0;
  isConnected$: Subscription;

  ngOnInit(): void {

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
    if (this.timesOfDayOrder$ && !this.timesOfDayOrder$.closed) {
      this.timesOfDayOrder$.unsubscribe();
    }

    this.timesOfDayOrder$ = this.userService.getTimesOfDayOrder$().subscribe((timesOfDayOrder: string[]) => {
      this.order = timesOfDayOrder;
    });
  }

  private updateTodayTaskList(): void {
    if (this.todayTasks$ && !this.todayTasks$.closed) {
      this.todayTasks$.unsubscribe();
    }

    this.todayTasks$ = this.userService.getTodayTasks$(this.todayName).subscribe((newTodayItems) => {
      this.todayItems = newTodayItems;
      this.todayItemsFirstLoading = false;
    });
  }

  observeTodayTasksList(): void {
    const now = new Date();
    this.todayName = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
    this.updateTodayTaskList();
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

    if (checkbox.disabled) {
      return;
    }

    const toUpdateOneTimeOfDay = {
      taskId,
      timeOfDay,
      checked: !checkbox.checked,
      todayName: this.todayName
    };

    checkbox.disabled = true;

    this.setProgressSubsActiveConnections++;

    const setProgressHttp: Subscription = this.fns.httpsCallable('setProgress')(toUpdateOneTimeOfDay).subscribe(() => {
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
      console.log(error);
      checkbox.disabled = false;
      this.setProgressSubsActiveConnections--;
      this.snackBar.open(error.details && typeof error.details === 'string' ? error.details : 'Some went wrong 🤫 Try again 🙂');
      if (this.setProgressSubsActiveConnections === 0) {
        console.log('all setProgressSubsActiveConnections done');
        this.changeDay();
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

    this.setProgress$.add(setProgressHttp);

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

    if (this.setProgress$ && !this.setProgress$.closed) {
      this.setProgress$.unsubscribe();
    }
  }

  private static toNextDayCalc(): number {
    const now = new Date();
    const todayPast: number = now.getSeconds() + (now.getMinutes() * 60) + (now.getHours() * 60 * 60);
    return 86400 - todayPast;
  }

}
