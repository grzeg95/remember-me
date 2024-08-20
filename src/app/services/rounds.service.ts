import {Location} from '@angular/common';
import {computed, effect, Inject, Injectable, signal} from '@angular/core';
import {Router} from '@angular/router';
import {collection, Firestore, limit, QueryDocumentSnapshot} from 'firebase/firestore';
import {catchError, EMPTY, forkJoin, map, Observable, of, Subscription, switchMap, throwError} from 'rxjs';
import {RouterDict} from '../app.constants';
import {FirestoreInjectionToken} from '../models/firebase';
import {Day, HTTPSuccess, TasksListItem, TodayItem} from '../models/models';
import {Round} from '../models/round';
import {Task} from '../models/task';
import {Today} from '../models/today';
import {TodayTask} from '../models/today-task';
import {User} from '../models/user';
import {AuthService} from './auth.service';
import {collectionSnapshots, docSnapshots} from './firebase/firestore';
import {FunctionsService} from './firebase/functions.service';

@Injectable()
export class RoundsService {

  //
  // Rounds
  //

  private _roundsList = signal<Round[]>([]);
  roundsOrder = signal<string[]>([]);
  roundsList = computed<Round[]>(() => {

    const roundsOrder = this.roundsOrder();
    const roundsList = this._roundsList();

    const roundsMap: { [key in string]: Round } = {};

    for (const round of roundsList) {
      roundsMap[round.id as string] = round;
    }

    return roundsOrder.filter((roundId) => roundsMap[roundId]).map((roundId) => roundsMap[roundId]);
  });
  roundsOrderFirstLoading = signal<boolean>(true);
  roundsListFirstLoading = signal<boolean>(true);
  selectedRound = signal<Round | undefined>(undefined);
  lastSelectedRound = signal<Round | undefined>(undefined);
  editedRound = signal<Round | undefined>(undefined);
  selectedRoundOnSnapSub: Subscription | undefined;
  roundsListSub: Subscription | undefined;
  roundsOrderSub: Subscription | undefined;

  //
  // Today items
  //

  todayItemsFirstLoading = signal<boolean>(true);
  private _todayItems = signal<{[p: string]: TodayItem[]}>({});
  todayItems = computed(() => {

    const round = this.selectedRound();
    const todayItems = this._todayItems();

    return round?.timesOfDay.filter((timeOfDay) => todayItems[timeOfDay]).map((timeOfDay) => ({
      timeOfDay,
      tasks: todayItems[timeOfDay]
    })) || [];
  });
  todayName = signal<{full: string, short: Day} | undefined>(undefined);
  lastTodayName = signal<{full: string, short: string} | undefined>(undefined);
  dayToSetInEditor = signal<Day | undefined>(undefined);
  now = signal<Date>(new Date());
  todayTasksSub: Subscription | undefined;
  todayNamesDocsSub: Subscription | undefined;

  //
  // Tasks list
  //

  tasksList = signal<TasksListItem[] | null>(null);
  tasksListFirstLoading = signal<boolean>(true);
  tasksListSub: Subscription | undefined;

  //
  // Task edit
  //
  dayToApply = signal<Day | null>(null);

  constructor(
    private authService: AuthService,
    @Inject(FirestoreInjectionToken) private readonly firestore: Firestore,
    private readonly functionsService: FunctionsService,
    private router: Router,
    private location: Location
  ) {
    effect(() => {
      const now = this.now();

      this.todayName.set({
        full: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()],
        short: (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as Day[])[now.getDay()]
      });
    }, {allowSignalWrites: true});
  }

  init() {
    this.runGettingOfRoundsOrder();
    this.runGettingOfRoundsList();
  }

  private runGettingOfRoundsOrder() {

    if (this.roundsOrderSub && !this.roundsOrderSub.closed) {
      return;
    }

    this.roundsOrderSub = this.authService.user$.subscribe((user) => {

      if (!user) {
        return;
      }

      this.roundsOrder.set(user.decryptedRounds);
      this.roundsOrderFirstLoading.set(false);
    });

    this.authService.onSnapshotSubs.add(this.roundsOrderSub);
  }

  private runGettingOfRoundsList(): void {

    if (this.roundsListSub && !this.roundsListSub.closed) {
      return;
    }

    const user = this.authService.user$.value;

    if (!user) {
      return;
    }

    // BasicEncryptedValue
    const userRef = User.ref(this.firestore, user.id);
    const roundsRefs = Round.refs(userRef);

    this.roundsListSub = collectionSnapshots(roundsRefs, limit(5)).pipe(
      switchMap(async (querySnap) => {

        if (!querySnap.docs.length) {
          return Promise.resolve<Round[]>([]);
        }

        // decrypt
        const roundsDecryptPromise: Promise<Round>[] = [];

        for (const queryDocSnap of querySnap.docs) {
          roundsDecryptPromise.push(Round.data(queryDocSnap, user.cryptoKey!));
        }

        return await Promise.all(roundsDecryptPromise);
      })
    ).subscribe((roundsList) => {
      this._roundsList.set(roundsList);
      this.roundsListFirstLoading.set(false);
    });

    this.authService.onSnapshotSubs.add(this.roundsListSub);
  }

  setGettingOfRoundById(id: string) {

    if (this.selectedRound()?.id === id) {
      this.lastSelectedRound.set(this.selectedRound());
      return;
    }

    this.selectedRound.set(undefined);
    this.lastSelectedRound.set(undefined);

    if (!id) {
      this.clearCacheRound();
      this.selectedRound.set(undefined);
      this.lastSelectedRound.set(undefined);
      this.router.navigate(['/', RouterDict.user, RouterDict.rounds, RouterDict.roundsList]);
      return;
    }

    if (this.selectedRound()?.id !== id) {

      this.clearCacheRound();

      if (this.selectedRoundOnSnapSub && !this.selectedRoundOnSnapSub.closed) {
        this.selectedRoundOnSnapSub.unsubscribe();
      }
    }

    if (this.selectedRoundOnSnapSub && !this.selectedRoundOnSnapSub.closed) {
      this.selectedRoundOnSnapSub.unsubscribe();
    }

    const user = this.authService.user$.value;

    if (!user) {
      return;
    }

    const userRef = User.ref(this.firestore, user.id);
    const roundRef = Round.ref(userRef, id);

    this.selectedRoundOnSnapSub = docSnapshots(roundRef).pipe(
      switchMap((docSnap) => {

        if (!docSnap.exists()) {
          throw throwError(() => {
          });
        }

        return Round.data(docSnap, user.cryptoKey!);
      }),
      catchError(() => {
        this.setGettingOfRoundById('');
        return EMPTY;
      }),
    ).subscribe((round) => {

      this.lastSelectedRound.set(this.selectedRound());
      this.selectedRound.set(round);

      if (round.id === 'null') {
        this.location.go(this.router.createUrlTree(['/', RouterDict.user, RouterDict.rounds, RouterDict.roundsList]).toString());
      }
    });

    this.authService.onSnapshotSubs.add(this.selectedRoundOnSnapSub);
  }

  saveRound(name: string, roundId: string = 'null'): Observable<{roundId: string, details: string, created: boolean}> {
    return this.functionsService.httpsCallable<{roundId: string, name: string}, {
      roundId: string,
      details: string,
      created: boolean
    }>('rounds-saveround', {
      roundId,
      name
    });
  }

  deleteRound(id: string): Observable<HTTPSuccess> {
    return this.functionsService.httpsCallable<string, HTTPSuccess>('rounds-deleteround', id);
  }

  setRoundsOrder(data: {moveBy: number, roundId: string}): Observable<HTTPSuccess> {
    return this.functionsService.httpsCallable<{
      moveBy: number,
      roundId: string
    }, HTTPSuccess>('rounds-setroundsorder', data);
  }

  clearCacheRounds() {

    //
    // Rounds
    //

    this._roundsList.set([]);
    this.roundsOrder.set([]);
    this.roundsOrderFirstLoading.set(true);
    this.roundsListFirstLoading.set(true);
    this.selectedRound.set(undefined);
    this.lastSelectedRound.set(undefined);
    this.editedRound.set(undefined);

    if (this.selectedRoundOnSnapSub && !this.selectedRoundOnSnapSub.closed) {
      this.selectedRoundOnSnapSub.unsubscribe();
    }

    if (this.roundsListSub && !this.roundsListSub.closed) {
      this.roundsListSub.unsubscribe();
    }

    if (this.roundsOrderSub && !this.roundsOrderSub.closed) {
      this.roundsOrderSub.unsubscribe();
    }
  }

  clearCacheRound() {

    //
    // Today items
    //

    this.todayItemsFirstLoading.set(true);
    this._todayItems.set({});
    this.todayName.set(undefined);
    this.lastTodayName.set(undefined);
    this.dayToSetInEditor.set(undefined);
    this.now.set(new Date());

    if (this.todayTasksSub && !this.todayTasksSub.closed) {
      this.todayTasksSub.unsubscribe();
    }

    if (this.todayNamesDocsSub && !this.todayNamesDocsSub.closed) {
      this.todayNamesDocsSub.unsubscribe();
    }

    //
    // Tasks list
    //

    this.tasksList.set(null);
    this.tasksListFirstLoading.set(true);

    if (this.tasksListSub && !this.tasksListSub.closed) {
      this.tasksListSub.unsubscribe();
    }
  }

  setGettingOfTodayTasks(round: Round): void {

    if (
      this.lastTodayName()?.full !== this.todayName()?.full ||
      this.lastTodayName()?.short !== this.todayName()?.short
    ) {
      this.todayTasksSub?.unsubscribe();
      this.todayNamesDocsSub?.unsubscribe();
    }

    this.lastTodayName.set(this.todayName());
    this.now.set(new Date());

    const user = this.authService.user$.value;

    if (!user) {
      return;
    }

    const userRef = User.ref(this.firestore, user.firebaseUser?.uid || '');
    const roundRef = Round.ref(userRef, round.id);
    const todayRefs = Today.refs(roundRef);

    this.todayNamesDocsSub = collectionSnapshots(todayRefs).subscribe((querySnap) => {

      if (!querySnap.docs.length) {
        this._todayItems.set({});
        this.todayItemsFirstLoading.set(false);
        return;
      }

      forkJoin(
        querySnap.docs.map((queryDocSnap) => Today.data(queryDocSnap, user.cryptoKey!))
      ).subscribe((todays) => {

        const todayName = this.todayName();

        let today: QueryDocumentSnapshot | undefined = undefined;
        for (const [i, doc] of querySnap.docs.entries()) {
          const name = todays[i].name;

          if (name === todayName?.short) {
            today = doc;
            break;
          }
        }

        if (!today) {
          this._todayItems.set({});
          this.todayItemsFirstLoading.set(false);
          return;
        }

        this.todayTasksSub?.unsubscribe();

        const userRef = User.ref(this.firestore, user.id);
        const roundRef = Round.ref(userRef, round.id);
        const todayRef = Today.ref(roundRef, today.id);
        const todayTasksRefs = TodayTask.refs(todayRef);

        this.todayTasksSub = collectionSnapshots(todayTasksRefs, limit(25)).subscribe((querySnap) => {

          const todayTasksByTimeOfDay: {[timeOfDay: string]: TodayItem[]} = {};
          const todayTaskArrPromise = querySnap.docs.map((encryptedTodayTask) => TodayTask.data(encryptedTodayTask, user.cryptoKey!));

          forkJoin(todayTaskArrPromise).subscribe((todayTaskArr) => {

            for (const [i, todayTask] of todayTaskArr.entries()) {

              Object.keys(todayTask.timesOfDayEncryptedMap).forEach((timeOfDay) => {

                if (!todayTasksByTimeOfDay[timeOfDay]) {
                  todayTasksByTimeOfDay[timeOfDay] = [];
                }

                const todayTaskItem = {
                  description: todayTask.decryptedDescription,
                  done: todayTask.timesOfDay[todayTask.timesOfDayEncryptedMap[timeOfDay]],
                  id: querySnap.docs[i].id,
                  disabled: false,
                  dayOfTheWeekId: today!.id,
                  timeOfDayEncrypted: todayTask.timesOfDayEncryptedMap[timeOfDay]
                };

                todayTasksByTimeOfDay[timeOfDay].push(todayTaskItem);
              });
            }

            if (todayTasksByTimeOfDay) {
              this._todayItems.set(todayTasksByTimeOfDay);
            }

            this.todayItemsFirstLoading.set(false);
          });
        });

        this.authService.onSnapshotSubs.add(this.todayTasksSub);
      });

    });

    this.authService.onSnapshotSubs.add(this.todayNamesDocsSub);
  }

  setTimesOfDayOrder(data: {timeOfDay: string, moveBy: number, roundId: string}): Observable<HTTPSuccess> {
    return this.functionsService.httpsCallable<{
      timeOfDay: string,
      moveBy: number,
      roundId: string
    }, HTTPSuccess>('rounds-settimesofdayorder', data);
  }

  setGettingOfTasksList(round: Round): void {

    if ((this.tasksListSub && !this.tasksListSub.closed) || !round) {
      return;
    }

    const user = this.authService.user$.value;

    if (!user) {
      return;
    }

    const userRef = User.ref(this.firestore, user.firebaseUser?.uid || '');
    const roundRef = Round.ref(userRef, round.id);
    const tasksRefs = Task.refs(roundRef);

    console.log(tasksRefs.path);

    this.tasksListSub = collectionSnapshots(tasksRefs, limit(25)).pipe(
      switchMap((querySnap) => {

        if (!querySnap.docs.length) {
          return of([]);
        }

        return forkJoin(querySnap.docs.map((docSnapTask) => Task.data(docSnapTask, user.cryptoKey!))).pipe(
          map((tasks) => {
            return tasks.map((task, index) => {
              return {
                description: task.description,
                timesOfDay: task.timesOfDay,
                daysOfTheWeek: task.daysOfTheWeek.length === 7 ? 'Every day' : task.daysOfTheWeek.join(', '),
                id: querySnap.docs[index].id
              } as TasksListItem;
            });
          })
        );
      })
    ).subscribe((tasks) => {
      this.tasksList.set(tasks);
      this.tasksListFirstLoading.set(false);
    });

    this.authService.onSnapshotSubs.add(this.tasksListSub);
  }

  saveTask(data: {
    task: {description: string, daysOfTheWeek: Day[], timesOfDay: string[]},
    taskId: string,
    roundId: string
  }): Observable<HTTPSuccess> {
    return this.functionsService.httpsCallable<{
      task: {description: string, daysOfTheWeek: Day[], timesOfDay: string[]},
      taskId: string,
      roundId: string
    }, HTTPSuccess>('rounds-savetask', data);
  }

  deleteTask(data: {taskId: string, roundId: string}): Observable<HTTPSuccess> {
    return this.functionsService.httpsCallable<{
      taskId: string,
      roundId: string
    }, HTTPSuccess>('rounds-deletetask', data);
  }
}
