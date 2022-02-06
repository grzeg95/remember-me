import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {AuthService} from '../../../auth/auth.service';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {filter, map, switchMap, take} from 'rxjs/operators';
import {AngularFireFunctions} from '@angular/fire/compat/functions';
import {decryptRound} from '../../../security';
import {Round} from '../../models';
import {ActivatedRoute} from '@angular/router';
import {TaskService} from './round/tasks/task/task.service';

@Injectable()
export class RoundsService {

  protected roundsListSub: Subscription;
  protected roundsOrderSub: Subscription;
  protected paramRoundIdSelectedSub: Subscription;
  protected nowSub: Subscription;

  roundsList$: BehaviorSubject<Round[]> = new BehaviorSubject<Round[]>([]);
  roundSelected$: BehaviorSubject<Round> = new BehaviorSubject<Round>(null);
  paramRoundIdSelected$: BehaviorSubject<string> = new BehaviorSubject<string>('');
  roundsOrder$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
  now$ = new BehaviorSubject<Date>(new Date());
  roundsOrderFirstLoading$ = new BehaviorSubject<boolean>(true);
  todayName$ = new BehaviorSubject<string>('');
  todayFullName$ = new BehaviorSubject<string>('');
  lastTodayName = '.';
  todayFirstLoading$ = new BehaviorSubject<boolean>(true);
  tasksFirstLoading$ = new BehaviorSubject<boolean>(true);
  roundsListFirstLoad$ = new BehaviorSubject<boolean>(true);
  inEditMode: boolean;
  editedRound$: BehaviorSubject<Round> = new BehaviorSubject<Round>(null);

  constructor(
    protected afs: AngularFirestore,
    protected authService: AuthService,
    protected fns: AngularFireFunctions,
    protected route: ActivatedRoute,
    protected taskService: TaskService
  ) {
  }

  init(): void {
    this.now$.next(new Date());
    this.lastTodayName = '.';

    this.runRoundsList();
    this.runParamRoundIdSelected();

    this.nowSub = this.now$.subscribe((now) => {
      this.todayFullName$.next(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()]);
      this.todayName$.next(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()]);
    });
  }

  clearCache(): void {

    if (this.roundsListSub && !this.roundsListSub.closed) {
      this.roundsListSub.unsubscribe();
    }

    if (this.roundsOrderSub && !this.roundsOrderSub.closed) {
      this.roundsOrderSub.unsubscribe();
    }

    if (this.paramRoundIdSelectedSub && !this.paramRoundIdSelectedSub.closed) {
      this.paramRoundIdSelectedSub.unsubscribe();
    }

    this.roundsList$.next([]);
    this.roundSelected$.next(null);
    this.paramRoundIdSelected$.next('');
    this.roundsOrder$.next([]);
    this.roundsList$.next([]);
    this.roundsOrderFirstLoading$.next(true);
    this.todayFirstLoading$.next(true);
    this.tasksFirstLoading$.next(true);
    this.roundsListFirstLoad$.next(true);
    this.nowSub.unsubscribe();
  }

  protected runRoundsList(): void {

    this.authService.userIsReady$.pipe(filter((isReady) => isReady), take(1)).subscribe(() => {
      this.roundsListSub = this.afs.collection<{ value: string }>(`users/${this.authService.userData.uid}/rounds`, (ref) => ref.limit(5)).valueChanges({idField: 'id'}).pipe(
        map((e) => {
          return e.reduce((previousValue, currentValue) => {
            return {
              ...previousValue,
              [currentValue.id]: currentValue
            };
          }, {});
        }),
        map(async (roundsEncrypted: { [ken in string]: { value: string } }) => {
          const rounds: { [ken in string]: Round } = {};
          for (const id of Object.getOwnPropertyNames(roundsEncrypted)) {
            const decryptedRound = await decryptRound(roundsEncrypted[id], this.authService.userData.cryptoKey);
            rounds[id] = {
              id,
              ...decryptedRound
            }
          }
          return rounds;
        })
      ).subscribe(async(roundsListPromise) => {

        const roundsList = await roundsListPromise;

        const roundsOrder = this.roundsOrder$.value;
        if (roundsOrder.length) {
          this.roundsList$.next(roundsOrder.map((orderId) => roundsList[orderId]));
        } else {
          this.roundsList$.next(Object.values(roundsList));
        }
        this.roundsListFirstLoad$.next(false);
        this.checkSelectedRound(this.roundsList$.value);
      });

      this.roundsOrderSub = this.authService.user$.subscribe((user) => {
        if (user?.rounds) {

          const roundsList = this.roundsList$.value;

          if (roundsList.length) {
            this.roundsList$.next(roundsList);
          }

          this.roundsOrder$.next(user.rounds);
          this.checkSelectedRound(roundsList);
        }
        this.roundsOrderFirstLoading$.next(false);
      });
    });
  }

  protected runParamRoundIdSelected(): void {
    this.authService.userIsReady$.pipe(filter((isReady) => isReady), take(1)).subscribe(() => {
      this.paramRoundIdSelectedSub = this.paramRoundIdSelected$.subscribe((roundParamIdSelected) => {
        this.checkSelectedRound(this.roundsList$.value, roundParamIdSelected);
      });
    });
  }

  protected checkSelectedRound(roundsList: Round[], roundId?: string): void {

    roundId = roundId || this.paramRoundIdSelected$.value;

    if (!roundId) {
      this.todayFirstLoading$.next(true);
      this.tasksFirstLoading$.next(true);
      this.roundSelected$.next(null);
      return;
    }

    const selectedRoundRoundsList = roundsList.find((round) => round.id === roundId);

    const roundSelectedTimesOfDay = this.roundSelected$.value?.timesOfDay || [];
    const selectedRoundRoundsListTimesOfDay = selectedRoundRoundsList?.timesOfDay || [];
    let theSameTimesOfDay = true;

    if (roundSelectedTimesOfDay.length === selectedRoundRoundsListTimesOfDay.length) {
      for (let i = 0; i < roundSelectedTimesOfDay.length; ++i) {
        if (roundSelectedTimesOfDay[i] !== selectedRoundRoundsListTimesOfDay[i]) {
          theSameTimesOfDay = false;
          break;
        }
      }
    } else {
      theSameTimesOfDay = false;
    }

    if (
      this.roundSelected$.value?.id === roundId &&
      this.roundSelected$.value?.name === selectedRoundRoundsList?.name &&
      theSameTimesOfDay &&
      this.roundSelected$.value?.taskSize === selectedRoundRoundsList?.taskSize
    ) {
      return;
    }

    if (roundsList && selectedRoundRoundsList) {
      this.roundSelected$.next(selectedRoundRoundsList);
    } else {
      this.roundSelected$.next(null);
    }
  }

  saveRound(name: string, roundId: string = 'null'): Observable<any> {
    return this.fns.httpsCallable('saveRound')({
      roundId,
      name
    });
  }

  getRoundById$(roundId: string): Observable<Promise<Round | null>> {

    return this.authService.userIsReady$.pipe(
      filter((isReady) => isReady),
      take(1),
      switchMap(() => {
        return this.afs.doc<{ value: string }>(`users/${this.authService.userData.uid}/rounds/${roundId}`).get().pipe(
          map(async (docSnap) => {
            const round = docSnap.data();
            if (round) {
              return await decryptRound(round, this.authService.userData.cryptoKey);
            }
            return null;
          })
        );
      })
    );
  }
}
