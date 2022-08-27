import {Component, Inject, OnDestroy, OnInit} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';
import {faCheckCircle} from '@fortawesome/free-solid-svg-icons';
import {doc, FieldPath, Firestore, updateDoc} from 'firebase/firestore';
import {interval, Subscription} from 'rxjs';
import {filter, take} from 'rxjs/operators';
import {RouterDict} from 'src/app/app.constants';
import {AuthService} from '../../../../../../auth/auth.service';
import {ConnectionService} from '../../../../../../connection.service';
import {FIRESTORE} from '../../../../../../injectors';
import {Day, TodayItem} from '../../../../../models';
import {RoundsService} from '../../../rounds.service';
import {TaskService} from '../task/task.service';

@Component({
  selector: 'app-today',
  templateUrl: './today.component.html',
  styleUrls: ['./today.component.scss']
})
export class TodayComponent implements OnInit, OnDestroy {

  todayName$ = this.roundsService.todayName$;
  todayFullName$ = this.roundsService.todayFullName$;

  isOnline: boolean;
  isOnlineSub: Subscription;
  wasTabInactiveSub: Subscription;
  wasOffline: boolean;

  RouterDict = RouterDict;
  faCheckCircle = faCheckCircle;
  destroyed = false;

  changeDayIntervalSub: Subscription;
  timesOfDayListSub: Subscription;
  selectedRoundSub: Subscription;

  selectedRoundChangeDaySub: Subscription;

  todayItemsViewFirstLoading$ = this.roundsService.todayItemsViewFirstLoading$;
  todayItemsSub: Subscription;
  todayItemsViewSub: Subscription;
  todayItemsView: {timeOfDay: string, tasks: TodayItem[]}[];

  constructor(
    private authService: AuthService,
    private roundsService: RoundsService,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
    private connectionService: ConnectionService,
    private taskService: TaskService,
    @Inject(FIRESTORE) private readonly firestore: Firestore
  ) {
  }

  ngOnInit(): void {

    this.destroyed = false;

    this.todayItemsSub = this.roundsService.todayItems$.pipe(filter((todayItems) => !!todayItems)).subscribe(() => this.roundsService.todayItemsViewUpdate(this.roundsService.selectedRound$.value));

    this.selectedRoundSub = this.roundsService.selectedRound$.subscribe((round) => this.roundsService.todayItemsViewUpdate(round));

    this.todayItemsViewSub = this.roundsService.todayItemsView$.subscribe((todayItemsView) => this.todayItemsView = todayItemsView);

    this.isOnlineSub = this.connectionService.isOnline$.subscribe((isOnline) => {
      this.isOnline = isOnline;
      if (isOnline) {
        this.changeDay();
      } else {
        this.wasOffline = true;
      }
    });

    this.wasTabInactiveSub = this.connectionService.wasTabInactive$.subscribe((wasTabInactive) => {
      if (wasTabInactive) {
        this.changeDay();
      }
    });
  }

  ngOnDestroy(): void {
    this.todayItemsSub.unsubscribe();
    this.selectedRoundSub.unsubscribe();
    this.todayItemsViewSub.unsubscribe();
    this.isOnlineSub.unsubscribe();
    this.wasTabInactiveSub.unsubscribe();

    if (this.changeDayIntervalSub && !this.changeDayIntervalSub.closed) {
      this.changeDayIntervalSub.unsubscribe();
    }

    if (this.timesOfDayListSub && !this.timesOfDayListSub.closed) {
      this.timesOfDayListSub.unsubscribe();
    }

    if (this.selectedRoundChangeDaySub && !this.selectedRoundChangeDaySub.closed) {
      this.selectedRoundChangeDaySub.unsubscribe();
    }

    this.destroyed = true;
  }

  todayItemIsDone(timeOfDay: string): boolean {
    return !this.roundsService.todayItems$.getValue()[timeOfDay].some((task) => !task.done);
  }

  trackByTodayItems(index: number, item: {timeOfDay: string, tasks: TodayItem[]}): string {
    return index + item.timeOfDay;
  }

  trackByTodayItem(index: number, item: TodayItem): string {
    return index + ('' + item.done) + item.description;
  }

  changeDay(): void {

    if (this.selectedRoundChangeDaySub && !this.selectedRoundChangeDaySub.closed) {
      this.selectedRoundChangeDaySub.unsubscribe();
    }

    this.selectedRoundChangeDaySub = this.roundsService.selectedRound$.pipe(filter((round) => !!round), take(1)).subscribe((round) => {
      this.roundsService.runToday(round);
      const now = new Date();
      this.roundsService.now$.next(now);
      const todayPast: number = now.getSeconds() + (now.getMinutes() * 60) + (now.getHours() * 60 * 60);
      const toNextDay = (86400 - todayPast) * 1000;

      if (this.changeDayIntervalSub && !this.changeDayIntervalSub.closed) {
        this.changeDayIntervalSub.unsubscribe();
      }

      this.changeDayIntervalSub = interval(toNextDay).subscribe(() => this.changeDay());
    });
  }

  setProgress(todayItem: TodayItem, event: Event): void {

    event.preventDefault();

    if (todayItem.disabled) {
      return;
    }

    todayItem.disabled = true;

    const user = this.authService.user$.value;

    updateDoc(
      doc(this.firestore, `/users/${user.uid}/rounds/${this.roundsService.selectedRound$.value.id}/today/${todayItem.dayOfTheWeekId}/task/${todayItem.id}`),
      new FieldPath('timesOfDay', todayItem.timeOfDayEncrypted),
      !todayItem.done
    ).then(() => {
      todayItem.disabled = false;
    }).catch(() => {
      if (!this.destroyed) {
        todayItem.disabled = false;
        this.snackBar.open('Some went wrong 🤫 Try again 🙂');
        this.changeDay();
      }
    });

    if (!this.isOnline) {
      todayItem.disabled = false;
      todayItem.done = !todayItem.done;
    }
  }

  addNewTask(): void {
    this.taskService.dayToApply = this.roundsService.todayName$.getValue() as Day;
    this.router.navigate(['../', RouterDict.taskEditor], {relativeTo: this.route});
  }
}
