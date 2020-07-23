import {AfterViewChecked, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {AngularFirestore} from '@angular/fire/firestore';
import {MatSnackBar} from '@angular/material/snack-bar';
import {faCheckCircle} from '@fortawesome/free-solid-svg-icons';
import {interval, Subscription} from 'rxjs';
import {RouterDict} from 'src/app/app.constants';
import {AppService} from '../../app-service';
import {AuthService} from '../../auth/auth.service';
import {TodayItem} from '../models';
import {UserService} from '../user.service';

@Component({
  selector: 'app-today',
  templateUrl: './today.component.html',
  styleUrls: ['./today.component.sass'],
  host: {class: 'app'}
})
export class TodayComponent implements OnInit, AfterViewChecked, OnDestroy {

  RouterDict = RouterDict;
  faCheckCircle = faCheckCircle;

  get timesOfDayOrder(): string[] {
    return this.userService.timesOfDayOrder;
  }

  get todayFirstLoading(): boolean {
    return this.userService.todayFirstLoading;
  }

  get timesOfDayFirstLoading(): boolean {
    return this.userService.timesOfDayOrderFirstLoading;
  }

  get today(): { [timeOfDay: string]: TodayItem[] } {
    return this.userService.today;
  }

  get todayItemsView(): { timeOfDay: string, tasks: TodayItem[] }[] {
    return this.timesOfDayOrder.filter((timeOfDay) => this.today[timeOfDay]).map((timeOfDay) => ({
      timeOfDay,
      tasks: this.today[timeOfDay]
    }));
  }

  get todayName(): string {
    return this.userService.todayName;
  }

  get now(): Date {
    return this.userService.now;
  }

  get todayFullName(): string {
    return this.userService.todayFullName;
  }

  get isEmpty(): boolean {
    return Object.keys(this.today).length === 0 || this.timesOfDayOrder.length === 0;
  }

  constructor(private afs: AngularFirestore,
              private cdRef: ChangeDetectorRef,
              private authService: AuthService,
              private userService: UserService,
              private snackBar: MatSnackBar,
              private appService: AppService) {}

  changeDayInterval: Subscription;
  isConnected$: Subscription;
  destroyed = false;

  ngOnInit(): void {
    this.isConnected$ = this.appService.isConnected$.subscribe((isConnected) => {
      if (isConnected) {
        this.changeDay();
      }
    });

    this.userService.runTimesOfDayOrder();
  }

  todayItemIsDone(timeOfDay: string): boolean {
    return !this.today[timeOfDay].some((task) => !task.done);
  }

  trackByTodayItems(index: number, item: { timeOfDay: string, tasks: TodayItem[] }): string {
    return index + item.timeOfDay;
  }

  trackByTodayItem(index: number, item: TodayItem): string {
    return index + ('' + item.done) + item.description;
  }

  changeDay(): void {
    this.userService.runToday();
    const todayPast: number = this.now.getSeconds() + (this.now.getMinutes() * 60) + (this.now.getHours() * 60 * 60);
    const toNextDay = (86400 - todayPast) * 1000;

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

    this.afs.doc(`/users/${this.authService.userData.uid}/today/${this.todayName}/task/${taskId}`).set(toMerge, {merge: true}).then(() => {
      checkbox.disabled = false;
    }).catch(() => {
      if (!this.destroyed) {
        checkbox.disabled = false;
        this.snackBar.open('Some went wrong 🤫 Try again 🙂');
        this.changeDay();
      }
    });

  }

  ngOnDestroy(): void {
    if (this.changeDayInterval && !this.changeDayInterval.closed) {
      this.changeDayInterval.unsubscribe();
    }
    this.isConnected$.unsubscribe();
    this.destroyed = true;
  }

  get isConnected(): boolean {
    return this.appService.isConnected$.getValue();
  }

}
