
import {AfterViewChecked, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {AngularFirestore, AngularFirestoreCollection} from '@angular/fire/firestore';
import {AngularFireFunctions} from '@angular/fire/functions';
import {interval, Subscription} from 'rxjs';
import {map, take} from 'rxjs/operators';
import {AuthService} from '../../auth/auth.service';
import {ITask, ITimesOfDay, ITodayItem, ITodayTimesOfDay} from '../models';
import {daysOfTheWeekOrderUS, timesOfDayDict, timesOfDayOrder} from '../models';
import {UserService} from '../user.service';

@Component({
  selector: 'app-today',
  templateUrl: './today.component.html',
  styleUrls: ['./today.component.sass'],
  host: { class: 'app' }
})
export class TodayComponent implements OnInit, AfterViewChecked, OnDestroy {

  get todayItemsFirstLoading(): boolean {
    return this.userService.todayItemsFirstLoading;
  }

  set todayItemsFirstLoading(value: boolean) {
    this.userService.todayItemsFirstLoading = value;
  }

  constructor(private fns: AngularFireFunctions,
              private cdRef: ChangeDetectorRef,
              private authService: AuthService,
              private userService: UserService,
              private afs: AngularFirestore) {}

  timesOfDayDict = timesOfDayDict;
  timesOfDayOrder = timesOfDayOrder;
  daysOfTheWeekOrderUS = daysOfTheWeekOrderUS;
  todayName: string;
  tasksCollection: AngularFirestoreCollection<ITask>;
  todayItems: {timeOfDay: string, task: ITodayItem[]}[] = [];
  tasksListSub: Subscription;
  setProgressSubs: Subscription = new Subscription();
  setProgressSubsActiveConnections = 0;
  changeDayInterval: Subscription = new Subscription();
  isEmpty = true;

  ngOnInit(): void {

    if (Object.entries(this.userService.todayItems).length !== 0 && this.userService.todayItems.constructor === Object) {
      this.isEmpty = false;
      this.generateView(this.userService.todayItems);
    }

    this.changeDay();

  }

  trackByTodayItems(index: number, item: {timeOfDay: string, task: ITodayItem[]}): string {
    return index + item.timeOfDay;
  }

  trackByTodayItem(index: number, item: {key: any, value: ITodayItem}): string {
    return index + item.value.type + item.value.done;
  }

  observeTasksList(): void {

    if (this.tasksListSub && !this.tasksListSub.closed) {
      this.tasksListSub.unsubscribe();
    }

    this.tasksListSub = this.tasksCollection.snapshotChanges().pipe(
      map((changes) => {

        const todayTasksByTimeOfDay: ITodayTimesOfDay = {};

        changes.forEach((change) => {

          const task: ITask = change.payload.doc.data() as ITask;
          const id: string = change.payload.doc.id;
          const type: string = change.type;

          if (typeof task.timesOfDay.duringTheDay === 'boolean') {
            if (!todayTasksByTimeOfDay.duringTheDay) {
              todayTasksByTimeOfDay.duringTheDay = [];
            }
            todayTasksByTimeOfDay.duringTheDay.push({
              description: task.description,
              done: task.timesOfDay.duringTheDay,
              type,
              id
            });
          } else {
            for (const timeOfDay in task.timesOfDay as ITimesOfDay) {
              if (task.timesOfDay.hasOwnProperty(timeOfDay)) {
                if (!todayTasksByTimeOfDay[timeOfDay]) {
                  todayTasksByTimeOfDay[timeOfDay] = [];
                }
                todayTasksByTimeOfDay[timeOfDay].push({
                  id,
                  description: task.description,
                  done: task.timesOfDay[timeOfDay],
                  type
                });
              }
            }
          }

        });

        return todayTasksByTimeOfDay;

      })).subscribe((todayTasksByTimeOfDay) => {
        console.log(todayTasksByTimeOfDay);
        this.userService.todayItems = todayTasksByTimeOfDay;
        this.generateView(this.userService.todayItems);
    });

  }

  generateView(todayTasksByTimeOfDay: ITodayTimesOfDay): void {

    const todayItemsTMP: {timeOfDay: string, task: ITodayItem[]}[] = [];

    this.timesOfDayOrder.forEach((next) => {
      if (todayTasksByTimeOfDay[next]) {

        const day = {
          timeOfDay: next,
          task: todayTasksByTimeOfDay[next]
        };

        todayItemsTMP.push(day);

      }
    });

    this.todayItems = todayItemsTMP;
    this.isEmpty = todayItemsTMP.length === 0;
    this.todayItemsFirstLoading = false;

  }

  changeDay(): void {

    const now = new Date();
    this.todayName = this.daysOfTheWeekOrderUS[now.getDay()];
    this.tasksCollection = this.afs.doc(`users/${this.authService.userData.uid}/`)
      .collection('today').doc(this.todayName).collection('task');
    this.observeTasksList();

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

    const handleSetProgressSubscriptionError = (error: any | null) => {
      checkbox.disabled = false;
      this.setProgressSubsActiveConnections--;
      if (this.setProgressSubsActiveConnections === 0) {
        console.log('all setProgressSubsActiveConnections done');
        this.changeDay();
      } else if (error) {
        console.log(error);
      } else { // complete with active others
        console.log('complete with active others: ' + this.setProgressSubsActiveConnections);
      }
    };

    const handleSetProgressSubscriptionSuccess = () => {
      checkbox.checked = toUpdateOneTimeOfDay.checked;
      checkbox.disabled = false;
      this.setProgressSubsActiveConnections--;

      if (this.setProgressSubsActiveConnections === 0) {
        console.log('all setProgressSubsActiveConnections done');
        this.changeDay();
      } else {
        console.log('complete with active others: ' + this.setProgressSubsActiveConnections);
      }

    };

    this.setProgressSubsActiveConnections++;
    if (!this.tasksListSub.closed) {
      console.log('this.tasksListSub.unsubscribe()');
      this.tasksListSub.unsubscribe();
    }

    const setProgressSubscription = this.fns.httpsCallable('setProgress')(toUpdateOneTimeOfDay).subscribe(() => {
      handleSetProgressSubscriptionSuccess();
    }, (error) => {
      handleSetProgressSubscriptionError(error);
    });

    this.setProgressSubs.add(setProgressSubscription);

  }

  ngOnDestroy(): void {
    this.changeDayInterval.unsubscribe();
    this.tasksListSub.unsubscribe();
    this.setProgressSubs.unsubscribe();
  }

  todayItemDone(todayItemElement: ITodayItem[]): boolean {
    return !todayItemElement.some((item) => !item.done);
  }

  private static toNextDayCalc(): number {
    const now = new Date();
    const todayPast: number = now.getSeconds() + (now.getMinutes() * 60) + (now.getHours() * 60 * 60);
    return 86400 - todayPast;
  }

}
