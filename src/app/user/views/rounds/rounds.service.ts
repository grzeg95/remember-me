import {Inject, Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {collection, doc, Firestore, getDoc, limit, onSnapshot, query} from 'firebase/firestore';
import {Functions, httpsCallable, httpsCallableFromURL} from 'firebase/functions';
import {getString, RemoteConfig} from 'firebase/remote-config';
import {BehaviorSubject, Subscription} from 'rxjs';
import {filter, take} from 'rxjs/operators';
import {Day} from '../../../../../functions/src/helpers/models';
import {RouterDict} from '../../../app.constants';
import {AuthService} from '../../../auth/auth.service';
import {ConnectionService} from '../../../connection.service';
import {FIRESTORE, FUNCTIONS, REMOTE_CONFIG} from '../../../injectors';
import {
  basicEncryptedValueConverter,
  decryptRound,
  decryptTask,
  decryptToday,
  decryptTodayTask,
  encryptedTodayTaskConverter
} from '../../../security';
import {HTTPSuccess, Round, Task, TasksListItem, TodayItem} from '../../models';

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
  todayItemsView$ = new BehaviorSubject<{ timeOfDay: string, tasks: TodayItem[] }[]>(null);
  todayItemsViewFirstLoading$ = new BehaviorSubject<boolean>(true);

  nowSub: Subscription;
  userSub: Subscription;
  roundsListFirstLoadingSub: Subscription;

  roundsListUnsub: () => void;
  todayDocsUnsub: () => void;
  todayUnsub: () => void;
  tasksListUnsub: () => void;

  lastTodayName = '.';

  constructor(
    @Inject(FUNCTIONS) private readonly functions: Functions,
    @Inject(FIRESTORE) private readonly firestore: Firestore,
    @Inject(REMOTE_CONFIG) private readonly remoteConfig: RemoteConfig,
    private authService: AuthService,
    private router: Router,
    private connectionService: ConnectionService
  ) {
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

    if (this.roundsListUnsub) {
      return;
    }

    const user = this.authService.user$.value;

    this.roundsListUnsub = onSnapshot(query(
      collection(this.firestore, `users/${user.uid}/rounds`).withConverter(basicEncryptedValueConverter),
      limit(5)
    ), async (snap) => {

      // decrypt
      const roundsDecryptPromise: Promise<Round>[] = [];

      for (const doc of snap.docs) {
        roundsDecryptPromise.push(decryptRound(doc.data(), user.cryptoKey));
      }

      Promise.all(roundsDecryptPromise).then((decryptedRoundList) => {

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
    this.authService.onSnapshotUnsubList.push(this.roundsListUnsub);
  }

  runToday(round: Round): void {

    if (this.lastTodayName !== this.todayName$.getValue() && this.todayUnsub) {
      this.unsubscribeTodaySub();
    }

    this.lastTodayName = this.todayName$.getValue();
    this.now$.next(new Date());

    if (this.todayUnsub || !round) {
      return;
    }

    this.unsubscribeTodayDocsSub();

    const user = this.authService.user$.value;

    this.todayDocsUnsub = onSnapshot(query(
      collection(this.firestore, `/users/${user.uid}/rounds/${round.id}/today`).withConverter(basicEncryptedValueConverter)
    ), async (snap) => {

      Promise.all(snap.docs.map((doc) => decryptToday(doc.data(), user.cryptoKey))).then((todays) => {
        const todayName = this.todayName$.value;

        let today;
        for (const [i, doc] of snap.docs.entries()) {
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

        this.todayUnsub = onSnapshot(query(
          collection(this.firestore, `/users/${user.uid}/rounds/${round.id}/today/${today.id}/task`).withConverter(encryptedTodayTaskConverter),
          limit(25)
        ), async (snap) => {

          const todayTasksByTimeOfDay: {[timeOfDay: string]: TodayItem[]} = {};
          const todayTaskArrPromise = snap.docs.map((encryptedTodayTask) => decryptTodayTask(encryptedTodayTask.data(), user.cryptoKey));

          Promise.all(todayTaskArrPromise).then((todayTaskArr) => {
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
        this.authService.onSnapshotUnsubList.push(this.todayUnsub);
      });

    });
    this.authService.onSnapshotUnsubList.push(this.todayDocsUnsub);
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

    if (this.tasksListUnsub || !round) {
      return;
    }

    const user = this.authService.user$.value;

    this.tasksListUnsub = onSnapshot(query(
      collection(this.firestore, `users/${user.uid}/rounds/${round.id}/task`).withConverter(basicEncryptedValueConverter),
      limit(25)
    ), async (snap) => {

      const taskArrPromise = snap.docs.map((encryptTask) => decryptTask(encryptTask.data(), user.cryptoKey));

      Promise.all(taskArrPromise).then((taskArr) => {
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

    this.authService.onSnapshotUnsubList.push(this.tasksListUnsub);
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

  saveRound(name: string, roundId: string = 'null'): Promise<{roundId: string, details: string, created: boolean}> {

    const saveRoundUrl = getString(this.remoteConfig, 'saveRoundUrl');
    let httpsCallableFunction = httpsCallable(this.functions, 'rounds-saveRound');

    if (saveRoundUrl) {
      httpsCallableFunction = httpsCallableFromURL(this.functions, saveRoundUrl);
    }

    return httpsCallableFunction({
      roundId,
      name
    }).then((e) => e.data as {roundId: string, details: string, created: boolean});
  }

  deleteRound(id: string): Promise<HTTPSuccess> {

    const deleteRoundUrl = getString(this.remoteConfig, 'deleteRoundUrl');
    let httpsCallableFunction = httpsCallable<string, HTTPSuccess>(this.functions, 'rounds-deleteRound');

    if (deleteRoundUrl) {
      httpsCallableFunction = httpsCallableFromURL<string, HTTPSuccess>(this.functions, deleteRoundUrl);
    }

    return httpsCallableFunction(id).then((e) => e.data as HTTPSuccess);
  }

  getRoundById(roundId: string): Promise<Round> {
    const user = this.authService.user$.value;

    return getDoc(
      doc(this.firestore, `users/${user.uid}/rounds/${roundId}`).withConverter(basicEncryptedValueConverter)
    ).then((snap) => {
      if (snap.exists()) {
        return decryptRound(snap.data(), user.cryptoKey);
      }
      return null;
    });
  }

  setRoundsOrder(data: {moveBy: number, roundId: string}): Promise<{[key: string]: string}> {

    const setRoundsOrderUrl = getString(this.remoteConfig, 'setRoundsOrderUrl');
    let httpsCallableFunction = httpsCallable(this.functions, 'rounds-setRoundsOrder');

    if (setRoundsOrderUrl) {
      httpsCallableFunction = httpsCallableFromURL(this.functions, setRoundsOrderUrl);
    }

    return httpsCallableFunction(data).then((e) => e.data as {[key: string]: string});
  }

  getTaskById(id: string, roundId: string): Promise<Task | null> {

    const user = this.authService.user$.value;

    return getDoc(
      doc(this.firestore, `users/${user.uid}/rounds/${roundId}/task/${id}`).withConverter(basicEncryptedValueConverter)
    ).then((taskDocSnap) => {
      const encryptedTask = taskDocSnap.data();

      if (encryptedTask) {
        return decryptTask(encryptedTask, user.cryptoKey);
      }

      return null;
    });
  }

  setTimesOfDayOrder(data: {timeOfDay: string, moveBy: number, roundId: string}): Promise<HTTPSuccess> {

    const setTimesOfDayOrderUrl = getString(this.remoteConfig, 'setTimesOfDayOrderUrl');
    let httpsCallableFunction = httpsCallable(this.functions, 'rounds-setTimesOfDayOrder');

    if (setTimesOfDayOrderUrl) {
      httpsCallableFunction = httpsCallableFromURL(this.functions, setTimesOfDayOrderUrl);
    }

    return httpsCallableFunction(data).then((e) => e.data as HTTPSuccess);
  }

  saveTask(data: {task: {description: string, daysOfTheWeek: Day[], timesOfDay: string[]}, taskId: string, roundId: string}): Promise<HTTPSuccess> {

    const saveTaskUrl = getString(this.remoteConfig, 'saveTaskUrl');
    let httpsCallableFunction = httpsCallable(this.functions, 'rounds-saveTask');

    if (saveTaskUrl) {
      httpsCallableFunction = httpsCallableFromURL(this.functions, saveTaskUrl);
    }

    return httpsCallableFunction(data).then((e) => e.data as HTTPSuccess);
  }

  deleteTask(data: {taskId: string, roundId: string}): Promise<HTTPSuccess> {

    const deleteTaskUrl = getString(this.remoteConfig, 'deleteTaskUrl');
    let httpsCallableFunction = httpsCallable<{taskId: string, roundId: string}, HTTPSuccess>(this.functions, 'rounds-deleteTask');

    if (deleteTaskUrl) {
      httpsCallableFunction = httpsCallableFromURL<{taskId: string, roundId: string}, HTTPSuccess>(this.functions, deleteTaskUrl);
    }

    return httpsCallableFunction(data).then((e) => e.data as HTTPSuccess);
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
    if (this.roundsListUnsub) {
      this.roundsListUnsub();
      this.roundsListUnsub = null;
    }
  }

  unsubscribeTodayDocsSub(): void {
    if (this.todayDocsUnsub) {
      this.todayDocsUnsub();
      this.todayDocsUnsub = null;
    }
  }

  unsubscribeTodaySub(): void {
    if (this.todayUnsub) {
      this.todayUnsub();
      this.todayUnsub = null;
    }
  }

  unsubscribeTasksListSub(): void {
    if (this.tasksListUnsub) {
      this.tasksListUnsub();
      this.tasksListUnsub = null;
    }
  }
}
