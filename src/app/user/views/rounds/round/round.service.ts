import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {RouterDict} from '../../../../app.constants';
import {decrypt, decryptTask, decryptTodayTask} from '../../../../security';
import {EncryptedTask, Round, TasksListItem, TodayItem, Task, EncryptedTodayTask} from '../../../models';
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

  today$ = new BehaviorSubject<{ [p: string]: TodayItem[] }>({});
  tasks$ = new BehaviorSubject<TasksListItem[]>([]);

  private todaySub: Subscription;
  private tasksListSub: Subscription;
  private lastRound: Round;
  todayDocsSub: Subscription;

  clearCache(): void {

    this.today$.next({});
    this.tasks$.next([]);
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
      this.roundsService.roundSelected$.pipe(skip(3)).subscribe((round) => {

        if (this.roundsService.inEditMode) {
          return;
        }

        if (round) {
          if (this.lastRound?.id !== round.id) {
            if (this.lastRound) {
              this.clearCache();
            } else {
              this.tasksFirstLoading$.next(true);
              this.todayFirstLoading$.next(true);
            }
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

    this.authService.userIsReady$.pipe(
      filter((isReady) => isReady),
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

      this.todayDocsSub = this.afs.collection(`/users/${this.authService.userData.uid}/rounds/${round.id}/today`).snapshotChanges().subscribe((some) => {

        const todayName = this.roundsService.todayName$.value;

        const documentChangeActionToday = some.find(async (doc) => {
          const name = await decrypt((doc.payload.doc.data() as { name: string })?.name, this.authService.userData.symmetricKey);
          return name === todayName;
        });

        if (this.todaySub && !this.todaySub.closed) {
          this.todaySub.unsubscribe();
        }

        if (!documentChangeActionToday) {
          this.today$.next({});
          this.todayFirstLoading$.next(false);
          return;
        }

        this.todaySub = this.afs.doc(documentChangeActionToday.payload.doc.ref.path).collection<EncryptedTodayTask>('task', (ref) => ref.limit(25))
          .snapshotChanges().pipe(
            map(async (documentChangeActionArr) => {

              const todayTasksByTimeOfDay: { [timeOfDay: string]: any[] } = {};

              for (const documentChangeAction of documentChangeActionArr) {
                const task = await decryptTodayTask(documentChangeAction.payload.doc.data(), this.authService.userData.symmetricKey);

                Object.keys(task.timesOfDay).forEach((timeOfDay) => {
                  if (!todayTasksByTimeOfDay[timeOfDay]) {
                    todayTasksByTimeOfDay[timeOfDay] = [];
                  }
                  todayTasksByTimeOfDay[timeOfDay].push({
                    description: task.description,
                    done: task.timesOfDay[timeOfDay],
                    id: documentChangeAction.payload.doc.id,
                    disabled: false,
                    dayOfTheWeekId: documentChangeActionToday.payload.doc.id,
                    timeOfDayEncrypted: task.timesOfDayEncryptedMap[timeOfDay]
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

    this.authService.userIsReady$.pipe(
      filter((isReady) => isReady),
      take(1)
    ).subscribe(() => {
      if (this.tasksListSub && !this.tasksListSub.closed || !round) {
        return;
      }

      this.tasksListSub = this.afs.doc(`users/${this.authService.userData.uid}/rounds/${round.id}`)
        .collection<EncryptedTask>('task', (ref) => ref.orderBy('description', 'asc').limit(25))
        .snapshotChanges().pipe(
          map((documentChangeActionArr) =>
            documentChangeActionArr.map(async (documentChangeAction) => {

              const task = await decryptTask(documentChangeAction.payload.doc.data() as EncryptedTask, this.authService.userData.symmetricKey);

              return {
                description: task.description,
                timesOfDay: task.timesOfDay,
                daysOfTheWeek: task.daysOfTheWeek.length === 7 ? 'Every day' : task.daysOfTheWeek.join(', '),
                id: documentChangeAction.payload.doc.id
              } as TasksListItem;
            })
          )
        ).subscribe(async (tasks) => {
          if (tasks) {
            this.tasks$.next(await Promise.all(tasks));
            this.tasksFirstLoading$.next(false);
          }
        });
    });
  }

  getTaskById$(id: string, roundId: string): Observable<Promise<Task | null>> {

    return this.authService.userIsReady$.pipe(
      filter((isReady) => isReady),
      take(1),
      switchMap(() => {
        return this.afs.doc<EncryptedTask>(`users/${this.authService.userData.uid}/rounds/${roundId}/task/${id}`).get().pipe(
          map(async (taskDocSnap) => {
            const encryptedTask = taskDocSnap.data();

            if (encryptedTask) {
              return await decryptTask(encryptedTask, this.authService.userData.symmetricKey);
            }

            return null;
          })
        );
      }));
  }

  updateTimesOfDayOrder(data: { timeOfDay: string, moveBy: number, roundId: string }): Observable<{ [key: string]: string }> {

    return this.authService.userIsReady$.pipe(
      filter((isReady) => isReady),
      take(1),
      switchMap(() => {
        return this.fns.httpsCallable('setTimesOfDayOrder')(data);
      })
    );
  }
}
