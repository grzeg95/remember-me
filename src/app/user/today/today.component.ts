import {Component, NgZone, OnDestroy, OnInit} from '@angular/core';
import {AngularFirestore} from '@angular/fire/firestore';
import {MatSnackBar} from '@angular/material/snack-bar';
import {faCheckCircle} from '@fortawesome/free-solid-svg-icons';
import {BehaviorSubject, interval, Observable, Subscription} from 'rxjs';
import {RouterDict} from 'src/app/app.constants';
import {AppService} from '../../app-service';
import {AuthService} from '../../auth/auth.service';
import {TimeOfDay, TodayItem} from '../models';
import {UserService} from '../user.service';

@Component({
  selector: 'app-today',
  templateUrl: './today.component.html',
  styleUrls: ['./today.component.scss']
})
export class TodayComponent implements OnInit, OnDestroy {

  get timesOfDayOrder$(): Observable<TimeOfDay[]> {
    return this.userService.timesOfDayOrder$;
  }

  get todayFirstLoading(): Observable<boolean> {
    return this.userService.todayFirstLoading$;
  }

  get timesOfDayFirstLoading$(): Observable<boolean> {
    return this.userService.timesOfDayOrderFirstLoading$;
  }

  get todayFirstLoading$(): Observable<boolean> {
    return this.userService.todayFirstLoading$;
  }

  get today$(): Observable<{ [timeOfDay: string]: TodayItem[] }> {
    return this.userService.today$;
  }

  get todayFullName$(): Observable<string> {
    return this.userService.todayFullName$;
  }

  get isConnected$(): Observable<boolean> {
    return this.appService.isConnected$;
  }

  RouterDict = RouterDict;
  faCheckCircle = faCheckCircle;
  changeDayIntervalSub: Subscription;
  todayItemsViewSub: Subscription = new Subscription();
  destroyed = false;
  isConnectedSub: Subscription;
  todayItemsView$: BehaviorSubject<{ timeOfDay: TimeOfDay, tasks: TodayItem[] }[]> = new BehaviorSubject([]);

  constructor(private afs: AngularFirestore,
              private authService: AuthService,
              private userService: UserService,
              private snackBar: MatSnackBar,
              private appService: AppService,
              private zone: NgZone) {
  }

  ngOnInit(): void {
    this.isConnectedSub = this.isConnected$.subscribe((isConnected) => {
      if (isConnected) {
        this.changeDay();
      }
    });

    this.userService.runTimesOfDayOrder();

    this.todayItemsViewSub.add(this.userService.today$.subscribe(() => this.todayItemsViewUpdate()));
    this.todayItemsViewSub.add(this.userService.timesOfDayOrder$.subscribe(() => this.todayItemsViewUpdate()));
  }

  todayItemsViewUpdate(): void {
    const order = this.userService.timesOfDayOrder$.getValue();
    const today = this.userService.today$.getValue();

    this.todayItemsView$.next(order.filter((timeOfDay) => today[timeOfDay.id]).map((timeOfDay) => ({
      timeOfDay,
      tasks: today[timeOfDay.id]
    })));
  }

  ngOnDestroy(): void {
    if (this.changeDayIntervalSub && !this.changeDayIntervalSub.closed) {
      this.changeDayIntervalSub.unsubscribe();
    }
    this.todayItemsViewSub.unsubscribe();
    this.isConnectedSub.unsubscribe();
    this.destroyed = true;
  }

  todayItemIsDone(timeOfDay: TimeOfDay): boolean {
    return !this.userService.today$.getValue()[timeOfDay.id].some((task) => !task.done);
  }

  trackByTodayItems(index: number, item: { timeOfDay: TimeOfDay, tasks: TodayItem[] }): string {
    return index + item.timeOfDay.id;
  }

  trackByTodayItem(index: number, item: TodayItem): string {
    return index + ('' + item.done) + item.description;
  }

  changeDay(): void {
    this.userService.runToday();
    const now = this.userService.now$.getValue();
    const todayPast: number = now.getSeconds() + (now.getMinutes() * 60) + (now.getHours() * 60 * 60);
    const toNextDay = (86400 - todayPast) * 1000;

    if (this.changeDayIntervalSub && !this.changeDayIntervalSub.closed) {
      this.changeDayIntervalSub.unsubscribe();
    }

    this.changeDayIntervalSub = interval(toNextDay).subscribe(() => this.changeDay());
  }

  setProgress(checkbox: HTMLInputElement, event: Event, taskId: string, timeOfDay: string): void {

    event.preventDefault();

    if (checkbox.disabled) {
      return;
    }

    checkbox.disabled = true;

    const toMerge = JSON.parse(`{"timesOfDay": {"${timeOfDay}": ${!checkbox.checked}}}`);

    this.afs.doc(`/users/${this.authService.userData.uid}/today/${this.userService.todayName$.getValue()}/task/${taskId}`).set(toMerge, {merge: true}).then(() => {
      checkbox.disabled = false;
    }).catch(() => {
      this.zone.run(() => {
        if (!this.destroyed) {
          checkbox.disabled = false;
          this.snackBar.open('Some went wrong 🤫 Try again 🙂');
          this.changeDay();
        }
      });
    });

  }

  decodeFirebaseSpecialCharacters(str: string): string {
    return str.decodeFirebaseSpecialCharacters();
  }

}
