import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {RouterDict} from '../../../../app.constants';
import {decryptTask, decryptToday, decryptTodayTask} from '../../../../security';
import {Round, TasksListItem, TodayItem, Task, EncryptedTodayTask} from '../../../models';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {AuthService} from '../../../../auth/auth.service';
import {AngularFireFunctions} from '@angular/fire/compat/functions';
import {AppService} from '../../../../app-service';
import {filter, map, skip, switchMap, take} from 'rxjs/operators';
import {RoundsService} from '../rounds.service';

@Injectable()
export class RoundService {

  set setTimesOfDayOrderSub(setTimesOfDayOrderSub: Subscription) {
    this._setTimesOfDayOrderSub = setTimesOfDayOrderSub;
  }

  get setTimesOfDayOrderSub(): Subscription {
    return this._setTimesOfDayOrderSub;
  }

  get roundsOrderFirstLoading$(): BehaviorSubject<boolean> {
    return this.roundsService.roundsOrderFirstLoading$;
  }

  get todayFirstLoading$(): BehaviorSubject<boolean> {
    return this.roundsService.todayFirstLoading$;
  }

  get tasksFirstLoading$(): BehaviorSubject<boolean> {
    return this.roundsService.tasksFirstLoading$;
  }

  private _setTimesOfDayOrderSub: Subscription;

  today$ = new BehaviorSubject<{ [p: string]: TodayItem[] }>(null);
  tasks$ = new BehaviorSubject<TasksListItem[]>(null);

  private todaySub: Subscription;
  private tasksListSub: Subscription;
  private lastRound: Round;
  todayDocsSub: Subscription;

  clearCache(): void {

    this.today$.next(null);
    this.tasks$.next(null);
    this.todayFirstLoading$.next(true);
    this.tasksFirstLoading$.next(true);

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
        this.tasksFirstLoading$.next(true);
        this.todayFirstLoading$.next(true);
        if (this._setTimesOfDayOrderSub && !this._setTimesOfDayOrderSub.closed) {
          this._setTimesOfDayOrderSub.unsubscribe();
        }
      }
    });

    this.roundsService.roundsListFirstLoad$.pipe(
      filter((roundsListFirstLoad) => roundsListFirstLoad),
      take(1)
    ).subscribe(() => {

      // Skąd mam wiedzieć, że ten null oznacza rezygnację
      // pod spodem musi być coś jeszcze
      // checkSelectedRound
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

  runToday(round: Round): void {

    this.authService.isUserReady$.pipe(
      filter((isUserReady) => isUserReady),
      take(1)
    ).subscribe(() => {
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

      this.todayDocsSub = this.afs.collection<{ value: string }>(`/users/${this.authService.userData.uid}/rounds/${round.id}/today`).valueChanges({idField: 'id'}).subscribe(async (some) => {

        const todayName = this.roundsService.todayName$.value;

        let today;
        for (const doc of some) {
          const name = (await decryptToday(doc, this.authService.userData.cryptoKey)).name;

          if (name === todayName) {
            today = doc;
            break;
          }
        }

        if (!today) {
          this.today$.next({});
          this.todayFirstLoading$.next(false);
          return;
        }

        if (!this.appService.isOnline$.value) {
          return;
        }

        if (this.todaySub && !this.todaySub.closed) {
          this.todaySub.unsubscribe();
        }

        this.todaySub = this.afs.doc(`/users/${this.authService.userData.uid}/rounds/${round.id}/today/${today.id}`).collection<EncryptedTodayTask>('task', (ref) => ref.limit(25))
          .valueChanges({idField: 'id'}).pipe(
            map(async (encryptedTodayTaskArr) => {

              const todayTasksByTimeOfDay: { [timeOfDay: string]: TodayItem[] } = {};
              const todayTaskArrPromise = encryptedTodayTaskArr.map((encryptedTodayTask) => decryptTodayTask(encryptedTodayTask, this.authService.userData.cryptoKey));
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
            this.todayFirstLoading$.next(false);
          });
      });
    });
  }

  runTasksList(round: Round): void {

    this.authService.isUserReady$.pipe(
      filter((isUserReady) => isUserReady),
      take(1)
    ).subscribe(() => {
      if (this.tasksListSub && !this.tasksListSub.closed || !round) {
        return;
      }

      this.tasksListSub = this.afs.doc(`users/${this.authService.userData.uid}/rounds/${round.id}`)
        .collection<{ value: string }>('task', (ref) => ref.limit(25))
        .valueChanges({idField: 'id'}).pipe(
          map(async (encryptedTaskArr) => {

            const taskArrPromise = encryptedTaskArr.map((encryptTask) => decryptTask(encryptTask, this.authService.userData.cryptoKey));
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
          this.tasksFirstLoading$.next(false);
        });
    });
  }

  getTaskById$(id: string, roundId: string): Observable<Promise<Task | null>> {

    return this.authService.isUserReady$.pipe(
      filter((isUserReady) => isUserReady),
      take(1),
      switchMap(() => {
        return this.afs.doc<{ value: string }>(`users/${this.authService.userData.uid}/rounds/${roundId}/task/${id}`).get().pipe(
          map(async (taskDocSnap) => {
            const encryptedTask = taskDocSnap.data();

            if (encryptedTask) {
              return await decryptTask(encryptedTask, this.authService.userData.cryptoKey);
            }

            return null;
          })
        );
      }));
  }

  updateTimesOfDayOrder(data: { timeOfDay: string, moveBy: number, roundId: string }): Observable<{ [key: string]: string }> {

    return this.authService.isUserReady$.pipe(
      filter((isUserReady) => isUserReady),
      take(1),
      switchMap(() => {
        return this.fns.httpsCallable('setTimesOfDayOrder')(data);
      })
    );
  }
}
