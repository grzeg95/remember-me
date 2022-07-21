import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { RouterDict } from '../../../../app.constants';
import { decryptTask, decryptToday, decryptTodayTask } from '../../../../security';
import { Round, TasksListItem, TodayItem, Task, EncryptedTodayTask } from '../../../models';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AuthService } from '../../../../auth/auth.service';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { AppService } from '../../../../app-service';
import { filter, map, skip, take } from 'rxjs/operators';
import { RoundsService } from '../rounds.service';

@Injectable()
export class RoundService {

  setTimesOfDayOrderSub: Subscription;

  today$ = new BehaviorSubject<{ [p: string]: TodayItem[] }>(null);
  tasks$ = new BehaviorSubject<TasksListItem[]>(null);

  private todaySub: Subscription;
  private tasksListSub: Subscription;
  private lastRound: Round;
  todayDocsSub: Subscription;

  constructor(
    private afs: AngularFirestore,
    private authService: AuthService,
    private fns: AngularFireFunctions,
    private appService: AppService,
    private roundsService: RoundsService,
    private router: Router
  ) {
  }

  init(): void {
    this.appService.isOnline$.subscribe((isOnline) => {
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

    this.today$.next(null);
    this.tasks$.next(null);
    this.roundsService.todayFirstLoading$.next(true);
    this.roundsService.tasksFirstLoading$.next(true);

    if (this.setTimesOfDayOrderSub && !this.setTimesOfDayOrderSub.closed) {
      this.setTimesOfDayOrderSub.unsubscribe();
    }

    if (this.todaySub && !this.todaySub.closed) {
      this.todaySub.unsubscribe();
    }

    if (this.tasksListSub && !this.tasksListSub.closed) {
      this.tasksListSub.unsubscribe();
    }

    if (this.todayDocsSub && !this.todayDocsSub.closed) {
      this.todayDocsSub.unsubscribe();
    }
  }

  runToday(round: Round): void {

    if (this.roundsService.lastTodayName !== this.roundsService.todayName$.getValue() && this.todaySub && !this.todaySub.closed) {
      this.todaySub.unsubscribe();
    }

    this.roundsService.lastTodayName = this.roundsService.todayName$.getValue();
    this.roundsService.now$.next(new Date());

    if (this.todaySub && !this.todaySub.closed || !round) {
      return;
    }

    if (this.todayDocsSub && !this.todayDocsSub.closed) {
      this.todayDocsSub.unsubscribe();
    }

    const user = this.authService.user$.value;

    this.todayDocsSub = this.afs.collection<{ value: string }>(`/users/${ user.uid }/rounds/${ round.id }/today`).valueChanges({idField: 'id'}).subscribe(async (some) => {

      const todayName = this.roundsService.todayName$.value;

      let today;
      for (const doc of some) {
        const name = (await decryptToday(doc, user.cryptoKey)).name;

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

      if (!this.appService.isOnline$.value) {
        return;
      }

      if (this.todaySub && !this.todaySub.closed) {
        this.todaySub.unsubscribe();
      }

      this.todaySub = this.afs.doc(`/users/${ user.uid }/rounds/${ round.id }/today/${ today.id }`).collection<EncryptedTodayTask>('task', (ref) => ref.limit(25))
        .valueChanges({idField: 'id'}).pipe(
          map(async (encryptedTodayTaskArr) => {

            const todayTasksByTimeOfDay: { [timeOfDay: string]: TodayItem[] } = {};
            const todayTaskArrPromise = encryptedTodayTaskArr.map((encryptedTodayTask) => decryptTodayTask(encryptedTodayTask, user.cryptoKey));
            const todayTaskArr = await Promise.all(todayTaskArrPromise);

            for (const [i, todayTask] of todayTaskArr.entries()) {

              Object.keys(todayTask.timesOfDay).forEach((timeOfDay) => {
                if (!todayTasksByTimeOfDay[timeOfDay]) {
                  todayTasksByTimeOfDay[timeOfDay] = [];
                }
                todayTasksByTimeOfDay[timeOfDay].push({
                  description: todayTask.description,
                  done: todayTask.timesOfDay[timeOfDay],
                  id: encryptedTodayTaskArr[i].id,
                  disabled: false,
                  dayOfTheWeekId: today.id,
                  timeOfDayEncrypted: todayTask.timesOfDayEncryptedMap[timeOfDay]
                });
              });
            }

            return todayTasksByTimeOfDay;

          })
        ).subscribe(async (todayPromise) => {
          const today = await todayPromise;
          if (today) {
            this.today$.next(today);
          }
          this.roundsService.todayFirstLoading$.next(false);
        });
    });
  }

  runTasksList(round: Round): void {

    if (this.tasksListSub && !this.tasksListSub.closed || !round) {
      return;
    }

    const user = this.authService.user$.value;

    this.tasksListSub = this.afs.doc(`users/${ user.uid }/rounds/${ round.id }`)
      .collection<{ value: string }>('task', (ref) => ref.limit(25))
      .valueChanges({idField: 'id'}).pipe(
        map(async (encryptedTaskArr) => {

          const taskArrPromise = encryptedTaskArr.map((encryptTask) => decryptTask(encryptTask, user.cryptoKey));
          const taskArr = await Promise.all(taskArrPromise);

          return taskArr.map((task, index) => {

            return {
              description: task.description,
              timesOfDay: task.timesOfDay,
              daysOfTheWeek: task.daysOfTheWeek.length === 7 ? 'Every day' : task.daysOfTheWeek.join(', '),
              id: encryptedTaskArr[index].id
            } as TasksListItem;
          })
        })
      ).subscribe(async (tasksPromise) => {
        const tasks = await tasksPromise;
        if (tasks) {
          this.tasks$.next(tasks);
        }
        this.roundsService.tasksFirstLoading$.next(false);
      });
  }

  getTaskById$(id: string, roundId: string): Observable<Promise<Task | null>> {

    const user = this.authService.user$.value;

    return this.afs.doc<{ value: string }>(`users/${ user.uid }/rounds/${ roundId }/task/${ id }`).get().pipe(
      map(async (taskDocSnap) => {
        const encryptedTask = taskDocSnap.data();

        if (encryptedTask) {
          return await decryptTask(encryptedTask, user.cryptoKey);
        }

        return null;
      })
    );
  }

  updateTimesOfDayOrder(data: { timeOfDay: string, moveBy: number, roundId: string }): Observable<{ [key: string]: string }> {
    return this.fns.httpsCallable('setTimesOfDayOrder')(data);
  }
}
