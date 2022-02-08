import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {AuthService} from '../../../auth/auth.service';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {filter, map, switchMap, take} from 'rxjs/operators';
import {AngularFireFunctions} from '@angular/fire/compat/functions';
import {decryptRound} from '../../../security';
import {Round} from '../../models';
import {ActivatedRoute} from '@angular/router';

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
    protected route: ActivatedRoute
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
        switchMap(async (docs) => {

          // decrypt
          const roundsDecryptPromise: Promise<Round>[] = [];

          for (const doc of docs) {
            roundsDecryptPromise.push(decryptRound(doc, this.authService.userData.cryptoKey));
          }

          const decryptedRoundList = await Promise.all(roundsDecryptPromise);

          for (const [i, doc] of docs.entries()) {
            decryptedRoundList[i].id = doc.id;
          }

          return decryptedRoundList;
        })
      ).subscribe((roundsList) => {
        this.generateLists(roundsList, this.roundsOrder$.value);
        this.roundsListFirstLoad$.next(false);
      });

      this.roundsOrderSub = this.authService.user$.subscribe((user) => {
        this.generateLists(this.roundsList$.value, user?.rounds);
        this.roundsOrderFirstLoading$.next(false);
      });
    });
  }

  protected generateLists(roundsList: Round[], roundsOrder: string[]): void {
    this.roundsList$.next(roundsList);
    this.roundsOrder$.next(roundsOrder);
    this.checkSelectedRound(roundsList);
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
