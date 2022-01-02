import {Component, NgZone, OnDestroy, OnInit} from '@angular/core';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {MatSnackBar} from '@angular/material/snack-bar';
import {faCheckCircle} from '@fortawesome/free-solid-svg-icons';
import {BehaviorSubject, interval, Observable, Subscription} from 'rxjs';
import {filter, take} from 'rxjs/operators';
import {RouterDict} from 'src/app/app.constants';
import {AppService} from '../../../../../../app-service';
import {AuthService} from '../../../../../../auth/auth.service';
import {Day, Round, TodayItem} from '../../../../../models';
import {ActivatedRoute, Router} from '@angular/router';
import {TaskService} from '../task/task.service';
import {RoundService} from '../../round.service';
import {RoundsService} from '../../../rounds.service';

@Component({
  selector: 'app-today',
  templateUrl: './today.component.html',
  styleUrls: ['./today.component.scss']
})
export class TodayComponent implements OnInit, OnDestroy {

  get roundsOrderFirstLoading$(): Observable<boolean> {
    return this.roundsService.roundsOrderFirstLoading$;
  }

  get todayFirstLoading$(): Observable<boolean> {
    return this.roundService.todayFirstLoading$;
  }

  get todayName$(): BehaviorSubject<string> {
    return this.roundsService.todayName$;
  }

  get todayFullName$(): Observable<string> {
    return this.roundsService.todayFullName$;
  }

  get isOnline$(): Observable<boolean> {
    return this.appService.isOnline$;
  }

  RouterDict = RouterDict;
  faCheckCircle = faCheckCircle;
  destroyed = false;
  todayItemsView$: BehaviorSubject<{ timeOfDay: string, tasks: TodayItem[] }[]> = new BehaviorSubject([]);
  changeDayIntervalSub: Subscription;
  todayItemsViewSub: Subscription;
  isConnectedSub: Subscription;
  timesOfDayListSub: Subscription;
  roundSelectedSub: Subscription;
  roundSelectedChangeDaySub: Subscription;

  constructor(private afs: AngularFirestore,
              private authService: AuthService,
              private roundService: RoundService,
              private roundsService: RoundsService,
              private snackBar: MatSnackBar,
              private appService: AppService,
              private zone: NgZone,
              private router: Router,
              private route: ActivatedRoute,
              private taskService: TaskService) {
  }

  ngOnInit(): void {

    this.destroyed = false;

    this.isConnectedSub = this.isOnline$.subscribe((isConnected) => {
      if (isConnected) {
        this.changeDay();
      }
    });

    this.todayItemsViewSub = this.roundService.today$.subscribe(() => this.todayItemsViewUpdate(this.roundsService.roundSelected$.value));

    this.roundSelectedSub = this.roundsService.roundSelected$.subscribe((round) => this.todayItemsViewUpdate(round));
  }

  ngOnDestroy(): void {
    this.clearCache();
  }

  todayItemsViewUpdate(round: Round): void {

    if (!round) {
      return;
    }

    const order = round.timesOfDay;
    const today = this.roundService.today$.getValue();

    if (!Object.getOwnPropertyNames(today).length) {
      return;
    }

    this.todayItemsView$.next(order.filter((timeOfDay) => today[timeOfDay]).map((timeOfDay) => ({
      timeOfDay,
      tasks: today[timeOfDay]
    })));

  }

  clearCache(): void {

    if (this.changeDayIntervalSub && !this.changeDayIntervalSub.closed) {
      this.changeDayIntervalSub.unsubscribe();
    }

    if (this.todayItemsViewSub && !this.todayItemsViewSub.closed) {
      this.todayItemsViewSub.unsubscribe();
    }

    if (this.isConnectedSub && !this.isConnectedSub.closed) {
      this.isConnectedSub.unsubscribe();
    }

    if (this.timesOfDayListSub && !this.timesOfDayListSub.closed) {
      this.timesOfDayListSub.unsubscribe();
    }

    if (this.roundSelectedSub && !this.roundSelectedSub.closed) {
      this.roundSelectedSub.unsubscribe();
    }

    if (this.roundSelectedChangeDaySub && !this.roundSelectedChangeDaySub.closed) {
      this.roundSelectedChangeDaySub.unsubscribe();
    }

    this.destroyed = true;
  }

  todayItemIsDone(timeOfDay: string): boolean {
    return !this.roundService.today$.getValue()[timeOfDay].some((task) => !task.done);
  }

  trackByTodayItems(index: number, item: { timeOfDay: string, tasks: TodayItem[] }): string {
    return index + item.timeOfDay;
  }

  trackByTodayItem(index: number, item: TodayItem): string {
    return index + ('' + item.done) + item.description;
  }

  changeDay(): void {

    if (this.roundSelectedChangeDaySub && !this.roundSelectedChangeDaySub.closed) {
      this.roundSelectedChangeDaySub.unsubscribe();
    }

    this.roundSelectedChangeDaySub = this.roundsService.roundSelected$.pipe(filter((round) => !!round), take(1)).subscribe((round) => {
      this.roundService.runToday(round);
      const now = this.roundsService.now$.getValue();
      const todayPast: number = now.getSeconds() + (now.getMinutes() * 60) + (now.getHours() * 60 * 60);
      const toNextDay = (86400 - todayPast) * 1000;

      if (this.changeDayIntervalSub && !this.changeDayIntervalSub.closed) {
        this.changeDayIntervalSub.unsubscribe();
      }

      this.changeDayIntervalSub = interval(toNextDay).subscribe(() => this.changeDay());
    });
  }

  setProgress(checkbox: TodayItem, event: Event, taskId: string, timeOfDay: string): void {

    event.preventDefault();

    if (checkbox.disabled) {
      return;
    }

    checkbox.disabled = true;

    const toMerge = JSON.parse(`{"timesOfDay": {"${timeOfDay}": ${!checkbox.done}}}`);

    this.afs.doc(`/users/${this.authService.userData.uid}/rounds/${this.roundsService.roundSelected$.value.id}/today/${this.roundsService.todayName$.value}/task/${taskId}`).set(toMerge, {merge: true}).then(() => {
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

  addNewTask(): void {
    this.taskService.dayToApply = this.todayName$.getValue() as Day;
    this.router.navigate(['../', RouterDict.taskEditor], {relativeTo: this.route});
  }
}
