import {AfterViewChecked, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {AngularFirestore, AngularFirestoreCollection} from '@angular/fire/firestore';
import {AngularFireFunctions} from '@angular/fire/functions';
import {MatSnackBar} from '@angular/material/snack-bar';
import {interval, Subscription} from 'rxjs';
import {map, take} from 'rxjs/operators';
import {AuthService} from '../../auth/auth.service';
import {IUser} from '../../auth/i-user';
import {ITask, ITodayItem} from '../models';
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

    this.isEmpty = this.order.length === 0 && Object.keys(this.todayItems).length === 0;

    return todayItemsViewContainer;
  }

  constructor(private fns: AngularFireFunctions,
              private cdRef: ChangeDetectorRef,
              private authService: AuthService,
              private userService: UserService,
              private afs: AngularFirestore,
              private snackBar: MatSnackBar) {}

  todayName: string;
  tasksCollection: AngularFirestoreCollection<ITask>;
  tasksListSub: Subscription;
  setProgressSubs: Subscription = new Subscription();
  userSubscription: Subscription = new Subscription();
  setProgressSubsActiveConnections = 0;
  changeDayInterval: Subscription = new Subscription();
  isEmpty = true;

  ngOnInit(): void {

    if (Object.entries(this.todayItems).length !== 0 && this.todayItems.constructor === Object) {
      this.isEmpty = false;
    }

    this.changeDay();

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

  observeUser(): void {
    this.userSubscription = this.userService.user$.subscribe((user: IUser) => {
      if (user.timesOfDay) {
        this.userService.prepareTimesOfDayOrder(user.timesOfDay);
      }
    });
  }

  observeTasksList(): void {

    if (this.tasksListSub && !this.tasksListSub.closed) {
      this.tasksListSub.unsubscribe();
    }

    this.tasksListSub = this.tasksCollection.snapshotChanges().pipe(
      map((changes) => {

        const todayTasksByTimeOfDay: {[timeOfDay: string]: ITodayItem[]} = {};

        changes.forEach((change) => {

          const task: ITask = change.payload.doc.data() as ITask;
          const id: string = change.payload.doc.id;

          for (const timeOfDay in task.timesOfDay) {
            if (task.timesOfDay.hasOwnProperty(timeOfDay)) {
              if (!todayTasksByTimeOfDay[timeOfDay]) {
                todayTasksByTimeOfDay[timeOfDay] = [];
              }
              todayTasksByTimeOfDay[timeOfDay].push({
                description: task.description,
                done: task.timesOfDay[timeOfDay],
                id
              });
            }
          }

        });

        this.todayItemsFirstLoading = false;
        return todayTasksByTimeOfDay;

      }))
      .subscribe((newTodayItems) => this.todayItems = newTodayItems);

  }

  changeDay(): void {

    if (this.changeDayInterval && !this.changeDayInterval.closed) {
      this.changeDayInterval.unsubscribe();
    }

    const now = new Date();
    this.todayName = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
    this.tasksCollection = this.afs.doc(`users/${this.authService.userData.uid}/today/${this.todayName}`)
      .collection('task', (ref) => ref.orderBy('description', 'asc'));
    this.observeTasksList();
    this.observeUser();

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
      this.snackBar.open(`Error: ${error?.message}`);
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

      this.todayItems[timeOfDay].find((task) => task.id === taskId).done = toUpdateOneTimeOfDay.checked;

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
      console.log('this.userSubscription.unsubscribe()');
      this.userSubscription.unsubscribe();
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
    this.userSubscription.unsubscribe();
  }

  private static toNextDayCalc(): number {
    const now = new Date();
    const todayPast: number = now.getSeconds() + (now.getMinutes() * 60) + (now.getHours() * 60 * 60);
    return 86400 - todayPast;
  }

}
