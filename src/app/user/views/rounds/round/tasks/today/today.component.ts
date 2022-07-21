import {Component, NgZone, OnDestroy, OnInit} from '@angular/core';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {MatSnackBar} from '@angular/material/snack-bar';
import {faCheckCircle} from '@fortawesome/free-solid-svg-icons';
import {interval, Subscription} from 'rxjs';
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

  todayName$ = this.roundsService.todayName$;
  todayFullName$ = this.roundsService.todayFullName$;

  isOnline: boolean;
  isOnlineSub: Subscription;

  todayFirstLoading: boolean;
  todayFirstLoadingSub: Subscription;

  roundsOrderFirstLoading: boolean;
  roundsOrderFirstLoadingSub: Subscription;

  RouterDict = RouterDict;
  faCheckCircle = faCheckCircle;
  destroyed = false;
  todayItemsView: { timeOfDay: string, tasks: TodayItem[] }[] = null;
  changeDayIntervalSub: Subscription;
  todayItemsViewSub: Subscription;
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

    this.todayItemsViewSub = this.roundService.today$.subscribe(() => this.todayItemsViewUpdate(this.roundsService.roundSelected$.value));

    this.roundSelectedSub = this.roundsService.roundSelected$.subscribe((round) => this.todayItemsViewUpdate(round));

    this.isOnlineSub = this.appService.isOnline$.subscribe((isOnline) => {
      this.isOnline = isOnline;
      if (isOnline) {
        this.changeDay();
      }
    });

    this.todayFirstLoadingSub = this.roundsService.todayFirstLoading$.subscribe((todayFirstLoading) => this.todayFirstLoading = todayFirstLoading);
    this.roundsOrderFirstLoadingSub = this.roundsService.roundsOrderFirstLoading$.subscribe((roundsOrderFirstLoading) => this.roundsOrderFirstLoading = roundsOrderFirstLoading);
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

    if (!today) {
      return;
    }

    this.todayItemsView = order.filter((timeOfDay) => today[timeOfDay]).map((timeOfDay) => ({
      timeOfDay,
      tasks: today[timeOfDay]
    }));
  }

  clearCache(): void {

    if (this.changeDayIntervalSub && !this.changeDayIntervalSub.closed) {
      this.changeDayIntervalSub.unsubscribe();
    }

    if (this.todayItemsViewSub && !this.todayItemsViewSub.closed) {
      this.todayItemsViewSub.unsubscribe();
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

    this.isOnlineSub.unsubscribe();
    this.todayFirstLoadingSub.unsubscribe();
    this.roundsOrderFirstLoadingSub.unsubscribe();

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

  setProgress(todayItem: TodayItem, event: Event): void {

    event.preventDefault();

    if (todayItem.disabled) {
      return;
    }

    todayItem.disabled = true;

    const toMerge = JSON.parse(`{"timesOfDay": {"${todayItem.timeOfDayEncrypted}": ${!todayItem.done}}}`);
    const user = this.authService.user$.value;

    this.afs.doc(`/users/${user.uid}/rounds/${this.roundsService.roundSelected$.value.id}/today/${todayItem.dayOfTheWeekId}/task/${todayItem.id}`).set(toMerge, {merge: true}).then(() => {
      todayItem.disabled = false;
    }).catch(() => {
      this.zone.run(() => {
        if (!this.destroyed) {
          todayItem.disabled = false;
          this.snackBar.open('Some went wrong 🤫 Try again 🙂');
          this.changeDay();
        }
      });
    });

  }

  addNewTask(): void {
    this.taskService.dayToApply = this.roundsService.todayName$.getValue() as Day;
    this.router.navigate(['../', RouterDict.taskEditor], {relativeTo: this.route});
  }
}
