import {Inject, Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {getString, RemoteConfig} from "firebase/remote-config";
import {BehaviorSubject, Subscription} from 'rxjs';
import {Day} from "../../../../../../functions/src/helpers/models";
import {RouterDict} from '../../../../app.constants';
import {ConnectionService} from '../../../../connection.service';
import {FIRESTORE, FUNCTIONS, REMOTE_CONFIG} from '../../../../injectors';
import {
  basicEncryptedValueConverter,
  decryptTask,
  decryptToday,
  decryptTodayTask, encryptedTodayTaskConverter
} from '../../../../security';
import {Round, TasksListItem, TodayItem, Task, HTTPSuccess} from '../../../models';
import {AuthService} from '../../../../auth/auth.service';
import {filter, skip, take} from 'rxjs/operators';
import {RoundsService} from '../rounds.service';
import {
  collection,
  doc,
  Firestore,
  getDoc,
  limit,
  onSnapshot,
  query
} from 'firebase/firestore';
import {Functions, httpsCallable, httpsCallableFromURL} from 'firebase/functions';

@Injectable()
export class RoundService {

  setTimesOfDayOrderSub: Subscription;

  today$ = new BehaviorSubject<{[p: string]: TodayItem[]}>(null);
  tasks$ = new BehaviorSubject<TasksListItem[]>(null);

  private isOnlineSub: Subscription;
  todayUnsub: () => void;
  tasksListUnsub: () => void;
  todayDocsUnsub: () => void;
  private lastRound: Round;

  constructor(
    private authService: AuthService,
    private roundsService: RoundsService,
    private router: Router,
    private connectionService: ConnectionService,
    @Inject(FUNCTIONS) private readonly functions: Functions,
    @Inject(FIRESTORE) private readonly firestore: Firestore,
    @Inject(REMOTE_CONFIG) private readonly remoteConfig: RemoteConfig
  ) {
  }

  init(): void {
    this.isOnlineSub = this.connectionService.isOnline$.subscribe((isOnline) => {
      if (!isOnline) {
        this.roundsService.tasksFirstLoading$.next(true);
        this.roundsService.todayFirstLoading$.next(true);
        if (this.setTimesOfDayOrderSub && !this.setTimesOfDayOrderSub.closed) {
          this.setTimesOfDayOrderSub.unsubscribe();
        }
      }
    });

    this.roundsService.roundsListFirstLoad$.pipe(
      filter((roundsListFirstLoad) => roundsListFirstLoad),
      take(1)
    ).subscribe(() => {

      this.roundsService.roundSelected$.pipe(skip(1)).subscribe((round) => {

        if (this.roundsService.inEditMode) {
          return;
        }

        if (round) {
          if (this.lastRound?.id !== round.id) {
            this.clearCache();
          }
        } else {
          this.clearCache();
          this.router.navigate(['/', RouterDict.user, RouterDict.rounds, RouterDict.roundsList]);
        }

        this.lastRound = round;
      });
    });
  }

  clearCache(): void {

    this.isOnlineSub.unsubscribe();
    this.today$.next(null);
    this.tasks$.next(null);
    this.roundsService.todayFirstLoading$.next(true);
    this.roundsService.tasksFirstLoading$.next(true);

    if (this.setTimesOfDayOrderSub && !this.setTimesOfDayOrderSub.closed) {
      this.setTimesOfDayOrderSub.unsubscribe();
    }

    if (this.todayUnsub) {
      this.todayUnsub();
      this.todayUnsub = null;
    }

    if (this.tasksListUnsub) {
      this.tasksListUnsub();
      this.tasksListUnsub = null;
    }

    if (this.todayDocsUnsub) {
      this.todayDocsUnsub();
      this.todayDocsUnsub = null;
    }
  }

  runToday(round: Round): void {

    if (this.roundsService.lastTodayName !== this.roundsService.todayName$.getValue() && this.todayUnsub) {
      this.todayUnsub();
    }

    this.roundsService.lastTodayName = this.roundsService.todayName$.getValue();
    this.roundsService.now$.next(new Date());

    if (this.todayUnsub || !round) {
      return;
    }

    if (this.todayDocsUnsub) {
      this.todayDocsUnsub();
      this.todayDocsUnsub = null;
    }

    const user = this.authService.user$.value;

    this.todayDocsUnsub = onSnapshot(query(
      collection(this.firestore, `/users/${user.uid}/rounds/${round.id}/today`).withConverter(basicEncryptedValueConverter)
    ), async (snap) => {

      Promise.all(snap.docs.map((doc) => decryptToday(doc.data(), user.cryptoKey))).then((todays) => {
        const todayName = this.roundsService.todayName$.value;

        let today;
        for (const [i, doc] of snap.docs.entries()) {
          const name = todays[i].name;

          if (name === todayName) {
            today = doc;
            break;
          }
        }

        if (!today) {
          this.today$.next({});
          this.roundsService.todayFirstLoading$.next(false);
          return;
        }

        if (!this.connectionService.isOnline$.value) {
          return;
        }

        if (this.todayUnsub) {
          this.todayUnsub();
          this.todayUnsub = null;
        }

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

            if (todayTasksByTimeOfDay) {
              this.today$.next(todayTasksByTimeOfDay);
            }

            this.roundsService.todayFirstLoading$.next(false);
          });
        });
      });

    });
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

        if (tasks) {
          this.tasks$.next(tasks);
        }
        this.roundsService.tasksFirstLoading$.next(false);
      });
    });
  }

  getTaskById$(id: string, roundId: string): Promise<Task | null> {

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
}
