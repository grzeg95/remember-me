import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {
  AngularFirebaseFirestoreService,
  AngularFirebaseFunctionsService,
  AngularFirebaseRemoteConfigService
} from 'angular-firebase';
import {AuthService} from 'auth';
import {limit} from 'firebase/firestore';
import {BehaviorSubject, forkJoin, mergeMap, Observable, Subscription} from 'rxjs';
import {filter, take} from 'rxjs/operators';
import {Day} from '../../../../../functions/src/helpers/models';
import {RouterDict} from '../../../app.constants';
import {ConnectionService} from '../../../connection.service';
import {BasicEncryptedValue, SecurityService} from '../../../security.service';
import {EncryptedTodayTask, HTTPSuccess, Round, Task, TasksListItem, TodayItem} from '../../models';

@Injectable()
export class RoundsService {

  roundsList$ = new BehaviorSubject<Round[]>(null);
  roundsOrder$ = new BehaviorSubject<string[]>(null);
  editedRound$ = new BehaviorSubject<Round>(null);
  selectedRound$ = new BehaviorSubject<Round>(null);

  roundsOrderFirstLoading$ = new BehaviorSubject<boolean>(true);
  tasksListViewFirstLoading$ = new BehaviorSubject<boolean>(true);
  todayName$ = new BehaviorSubject<string>('');
  todayFullName$ = new BehaviorSubject<string>('');
  now$ = new BehaviorSubject<Date>(new Date());
  tasks$ = new BehaviorSubject<TasksListItem[]>(null);

  roundsListFirstLoading$ = new BehaviorSubject<boolean>(true);

  todayItems$ = new BehaviorSubject<{[p: string]: TodayItem[]}>(null);
  todayItemsView$ = new BehaviorSubject<{timeOfDay: string, tasks: TodayItem[]}[]>(null);
  todayItemsViewFirstLoading$ = new BehaviorSubject<boolean>(true);

  nowSub: Subscription;
  userSub: Subscription;
  roundsListFirstLoadingSub: Subscription;

  roundsListSub: Subscription;
  todayDocsSub: Subscription;
  todaySub: Subscription;
  tasksListSub: Subscription;

  lastTodayName = '.';

  constructor(
    private angularFirebaseFunctionService: AngularFirebaseFunctionsService,
    private angularFirebaseRemoteConfigService: AngularFirebaseRemoteConfigService,
    private authService: AuthService,
    private router: Router,
    private connectionService: ConnectionService,
    private securityService: SecurityService,
    private angularFirebaseFirestoreService: AngularFirebaseFirestoreService
  ) {
  }

  init() {
    this.userSub = this.authService.user$.subscribe((user) => {

      // after log out user will be null
      if (user) {
        this.roundsOrder$.next(user.rounds);
        this.roundsOrderFirstLoading$.next(false);
        if (this.selectedRound$.value) {
          this.selectRound(this.selectedRound$.value.id);
        }
      }
    });

    this.nowSub = this.now$.subscribe((now) => {
      this.todayFullName$.next(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()]);
      this.todayName$.next(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()]);
    });
  }

  runRoundsList(): void {

    if (this.roundsListSub && !this.roundsListSub.closed) {
      return;
    }

    const user = this.authService.user$.value;

    this.roundsListSub = this.angularFirebaseFirestoreService.collectionOnSnapshot<BasicEncryptedValue>(`users/${user.uid}/rounds`, limit(5)).subscribe((snap) => {
      if (!snap.docs.length) {
        this.roundsList$.next([]);
        this.roundsListFirstLoading$.next(false);
        return
      }

      // decrypt
      const roundsDecrypt$: Observable<Round>[] = [];

      for (const doc of snap.docs) {
        roundsDecrypt$.push(this.securityService.decryptRound(doc.data(), user.cryptoKey));
      }

      forkJoin(roundsDecrypt$).subscribe((decryptedRoundList) => {

        for (const [i, doc] of snap.docs.entries()) {
          decryptedRoundList[i].id = doc.id;
        }

        this.roundsList$.next(decryptedRoundList);

        if (this.selectedRound$.value) {
          this.selectRound(this.selectedRound$.value.id);
        }

        this.roundsListFirstLoading$.next(false);
      });
    });

    this.authService.onSnapshotSubs.push(this.roundsListSub);
  }

  runToday(round: Round): void {

    if (this.lastTodayName !== this.todayName$.getValue() && this.todaySub && !this.todaySub.closed) {
      this.unsubscribeTodaySub();
    }

    this.lastTodayName = this.todayName$.getValue();
    this.now$.next(new Date());

    if ((this.todaySub && !this.todaySub.closed) || !round) {
      return;
    }

    this.unsubscribeTodayDocsSub();

    const user = this.authService.user$.value;

    this.todayDocsSub = this.angularFirebaseFirestoreService.collectionOnSnapshot<BasicEncryptedValue>(`/users/${user.uid}/rounds/${round.id}/today`).subscribe((querySnap) => {

      if (!querySnap.docs.length) {
        this.todayItems$.next({});
        return;
      }

      forkJoin(
        querySnap.docs.map((queryDocSnap) => this.securityService.decryptToday(queryDocSnap.data(), user.cryptoKey))
      ).subscribe((todays) => {
        const todayName = this.todayName$.value;

        let today;
        for (const [i, doc] of querySnap.docs.entries()) {
          const name = todays[i].name;

          if (name === todayName) {
            today = doc;
            break;
          }
        }

        if (!today && this.connectionService.isOnline$.value) {
          this.todayItems$.next({});
          return;
        }

        if (!today && !this.connectionService.isOnline$.value) {
          return;
        }

        this.unsubscribeTodaySub();

        this.todaySub = this.angularFirebaseFirestoreService.collectionOnSnapshot<EncryptedTodayTask>(`/users/${user.uid}/rounds/${round.id}/today/${today.id}/task`, limit(25)).subscribe((snap) => {

          const todayTasksByTimeOfDay: {[timeOfDay: string]: TodayItem[]} = {};
          const todayTaskArrPromise = snap.docs.map((encryptedTodayTask) => this.securityService.decryptTodayTask(encryptedTodayTask.data(), user.cryptoKey));

          forkJoin(todayTaskArrPromise).subscribe((todayTaskArr) => {

            for (const [i, todayTask] of todayTaskArr.entries()) {

              Object.keys(todayTask.timesOfDay).forEach((timeOfDay) => {
                if (!todayTasksByTimeOfDay[timeOfDay]) {
                  todayTasksByTimeOfDay[timeOfDay] = [];
                }
                todayTasksByTimeOfDay[timeOfDay].push({
                  description: todayTask.description,
                  done: todayTask.timesOfDay[timeOfDay],
                  id: snap.docs[i].id,
                  disabled: false,
                  dayOfTheWeekId: today.id,
                  timeOfDayEncrypted: todayTask.timesOfDayEncryptedMap[timeOfDay]
                });
              });
            }

            if (!this.connectionService.isOnline$.value) {
              return;
            }

            if (todayTasksByTimeOfDay) {
              this.todayItems$.next(todayTasksByTimeOfDay);
            }

          });
        });

        this.authService.onSnapshotSubs.push(this.todaySub);
      });

    });

    this.authService.onSnapshotSubs.push(this.todayDocsSub);
  }

  todayItemsViewUpdate(round: Round): void {

    if (!round) {
      return;
    }

    const order = round.timesOfDay;
    const today = this.todayItems$.getValue();

    if (!today) {
      return;
    }

    this.todayItemsView$.next(
      order.filter((timeOfDay) => today[timeOfDay]).map((timeOfDay) => ({
        timeOfDay,
        tasks: today[timeOfDay]
      }))
    );

    this.todayItemsViewFirstLoading$.next(false);
  }

  runTasksList(round: Round): void {

    if ((this.tasksListSub && !this.tasksListSub.closed) || !round) {
      return;
    }

    const user = this.authService.user$.value;

    this.tasksListSub = this.angularFirebaseFirestoreService.collectionOnSnapshot<BasicEncryptedValue>(
      `users/${user.uid}/rounds/${round.id}/task`,
      limit(25)
    ).subscribe((snap) => {

      if (!snap.docs.length) {
        this.tasks$.next([]);
        this.tasksListViewFirstLoading$.next(false);
        return;
      }

      const taskArrPromise = snap.docs.map((encryptTask) => this.securityService.decryptTask(encryptTask.data(), user.cryptoKey));

      forkJoin(taskArrPromise).subscribe((taskArr) => {
        const tasks = taskArr.map((task, index) => {
          return {
            description: task.description,
            timesOfDay: task.timesOfDay,
            daysOfTheWeek: task.daysOfTheWeek.length === 7 ? 'Every day' : task.daysOfTheWeek.join(', '),
            id: snap.docs[index].id
          } as TasksListItem;
        });

        if (!this.connectionService.isOnline$.value) {
          return;
        }

        if (tasks) {
          this.tasks$.next(tasks);
        }
        this.tasksListViewFirstLoading$.next(false);
      });
    });

    this.authService.onSnapshotSubs.push(this.tasksListSub);
  }

  selectRound(roundId: string): void {

    if (this.roundsListFirstLoadingSub && !this.roundsListFirstLoadingSub.closed) {
      this.roundsListFirstLoadingSub.unsubscribe();
    }

    this.roundsListFirstLoadingSub = this.roundsListFirstLoading$.pipe(
      filter((first) => !first),
      take(1)
    ).subscribe(() => {
      const roundsOrder = this.roundsOrder$.value;

      for (const roundsOrderId of roundsOrder || []) {
        if (roundsOrderId === roundId) {
          const round = this.roundsList$.value.find((round) => round.id === roundId);
          if (this.selectedRound$.value?.id !== round.id) {

            this.unsubscribeTodayDocsSub();
            this.unsubscribeTodaySub();
            this.unsubscribeTasksListSub();

            this.tasksListViewFirstLoading$.next(true);
            this.todayItems$.next(null);
            this.todayItemsViewFirstLoading$.next(true);
            this.todayItemsView$.next(null);
          }
          this.selectedRound$.next(round);
          return;
        }
      }

      this.selectedRound$.next(null);
      this.router.navigate(['/', RouterDict.user, RouterDict.rounds, RouterDict.roundsList])
    });
  }

  saveRound(name: string, roundId: string = 'null'): Observable<{roundId: string, details: string, created: boolean}> {

    const saveRoundUrl = this.angularFirebaseRemoteConfigService.getString('saveRoundUrl');
    let httpsCallableFunction = this.angularFirebaseFunctionService.httpsCallable<{roundId: string, name: string}, {roundId: string, details: string, created: boolean}>('rounds-saveRound');

    if (saveRoundUrl) {
      httpsCallableFunction = this.angularFirebaseFunctionService.httpsCallableFromURL<{roundId: string, name: string}, {roundId: string, details: string, created: boolean}>(saveRoundUrl);
    }

    return httpsCallableFunction({
      roundId,
      name
    });
  }

  deleteRound(id: string): Observable<HTTPSuccess> {

    const deleteRoundUrl = this.angularFirebaseRemoteConfigService.getString('deleteRoundUrl');
    let httpsCallableFunction = this.angularFirebaseFunctionService.httpsCallable<string, HTTPSuccess>('rounds-deleteRound');

    if (deleteRoundUrl) {
      httpsCallableFunction = this.angularFirebaseFunctionService.httpsCallableFromURL<string, HTTPSuccess>(deleteRoundUrl);
    }

    return httpsCallableFunction(id);
  }

  getRoundById(roundId: string): Observable<Round> {
    const user = this.authService.user$.value;

    return this.angularFirebaseFirestoreService.getDoc<BasicEncryptedValue>(`users/${user.uid}/rounds/${roundId}`).pipe(mergeMap((snap) => {
      if (snap.exists()) {
        return this.securityService.decryptRound(snap.data(), user.cryptoKey);
      }
      return null;
    }));
  }

  setRoundsOrder(data: {moveBy: number, roundId: string}): Observable<{[key: string]: string}> {

    const setRoundsOrderUrl = this.angularFirebaseRemoteConfigService.getString('setRoundsOrderUrl');
    let httpsCallableFunction = this.angularFirebaseFunctionService.httpsCallable<{moveBy: number, roundId: string}, {[key: string]: string}>('rounds-setRoundsOrder');

    if (setRoundsOrderUrl) {
      httpsCallableFunction = this.angularFirebaseFunctionService.httpsCallableFromURL<{moveBy: number, roundId: string}, {[key: string]: string}>(setRoundsOrderUrl);
    }

    return httpsCallableFunction(data);
  }

  getTaskById(id: string, roundId: string): Observable<Task | null> {

    const user = this.authService.user$.value;

    return this.angularFirebaseFirestoreService.getDoc<BasicEncryptedValue>(`users/${user.uid}/rounds/${roundId}/task/${id}`).pipe(mergeMap((taskDocSnap) => {
      const encryptedTask = taskDocSnap.data();

      if (encryptedTask) {
        return this.securityService.decryptTask(encryptedTask, user.cryptoKey);
      }

      return null;
    }));
  }

  setTimesOfDayOrder(data: {timeOfDay: string, moveBy: number, roundId: string}): Observable<HTTPSuccess> {

    const setTimesOfDayOrderUrl = this.angularFirebaseRemoteConfigService.getString('setTimesOfDayOrderUrl');
    let httpsCallableFunction = this.angularFirebaseFunctionService.httpsCallable<{timeOfDay: string, moveBy: number, roundId: string}, HTTPSuccess>('rounds-setTimesOfDayOrder');

    if (setTimesOfDayOrderUrl) {
      httpsCallableFunction = this.angularFirebaseFunctionService.httpsCallableFromURL<{timeOfDay: string, moveBy: number, roundId: string}, HTTPSuccess>(setTimesOfDayOrderUrl);
    }

    return httpsCallableFunction(data);
  }

  saveTask(data: {task: {description: string, daysOfTheWeek: Day[], timesOfDay: string[]}, taskId: string, roundId: string}): Observable<HTTPSuccess> {

    const saveTaskUrl = this.angularFirebaseRemoteConfigService.getString('saveTaskUrl');
    let httpsCallableFunction = this.angularFirebaseFunctionService.httpsCallable<{task: {description: string, daysOfTheWeek: Day[], timesOfDay: string[]}, taskId: string, roundId: string}, HTTPSuccess>('rounds-saveTask');

    if (saveTaskUrl) {
      httpsCallableFunction = this.angularFirebaseFunctionService.httpsCallableFromURL<{task: {description: string, daysOfTheWeek: Day[], timesOfDay: string[]}, taskId: string, roundId: string}, HTTPSuccess>(saveTaskUrl);
    }

    return httpsCallableFunction(data);
  }

  deleteTask(data: {taskId: string, roundId: string}): Observable<HTTPSuccess> {

    const deleteTaskUrl = this.angularFirebaseRemoteConfigService.getString('deleteTaskUrl');
    let httpsCallableFunction = this.angularFirebaseFunctionService.httpsCallable<{taskId: string, roundId: string}, HTTPSuccess>('rounds-deleteTask');

    if (deleteTaskUrl) {
      httpsCallableFunction = this.angularFirebaseFunctionService.httpsCallableFromURL<{taskId: string, roundId: string}, HTTPSuccess>(deleteTaskUrl);
    }

    return httpsCallableFunction(data);
  }

  clearCache() {
    if (this.userSub && !this.userSub.closed) {
      this.userSub.unsubscribe();
    }

    if (this.nowSub && !this.nowSub.closed) {
      this.nowSub.unsubscribe();
    }

    if (this.roundsListFirstLoadingSub && !this.roundsListFirstLoadingSub.closed) {
      this.roundsListFirstLoadingSub.unsubscribe();
    }

    this.unsubscribeRoundsListSub();
    this.unsubscribeTodayDocsSub();
    this.unsubscribeTodaySub();
    this.unsubscribeTasksListSub()

    this.roundsList$.next(null);
    this.roundsOrder$.next(null);
    this.editedRound$.next(null);
    this.selectedRound$.next(null);

    this.roundsOrderFirstLoading$.next(true);
    this.tasksListViewFirstLoading$.next(true);
    this.todayName$ = new BehaviorSubject<string>('');
    this.todayFullName$ = new BehaviorSubject<string>('');
    this.now$ = new BehaviorSubject<Date>(new Date());
    this.tasks$.next(null);

    this.roundsListFirstLoading$.next(true);

    this.todayItems$.next(null);
    this.todayItemsView$.next(null);
    this.todayItemsViewFirstLoading$.next(true);
  }

  unsubscribeRoundsListSub(): void {
    if (this.roundsListSub && !this.roundsListSub.closed) {
      this.roundsListSub.unsubscribe();
    }
  }

  unsubscribeTodayDocsSub(): void {
    if (this.todayDocsSub && !this.todayDocsSub.closed) {
      this.todayDocsSub.unsubscribe();
    }
  }

  unsubscribeTodaySub(): void {
    if (this.todaySub && !this.todaySub.closed) {
      this.todaySub.unsubscribe();
    }
  }

  unsubscribeTasksListSub(): void {
    if (this.tasksListSub && !this.tasksListSub.closed) {
      this.tasksListSub.unsubscribe();
    }
  }
}
