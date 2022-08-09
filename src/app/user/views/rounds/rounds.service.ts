import {Inject, Injectable} from '@angular/core';
import {AuthService} from '../../../auth/auth.service';
import {BehaviorSubject, mergeMap, Observable, of, Subscription} from 'rxjs';
import {filter, map} from 'rxjs/operators';
import {ConnectionService} from '../../../connection.service';
import {basicEncryptedValueConverter, decryptRound} from '../../../security';
import {Round} from '../../models';
import {ActivatedRoute} from '@angular/router';
import {
  limit,
  collection,
  query,
  Firestore,
  onSnapshot,
  doc,
  getDoc
} from 'firebase/firestore';
import {Functions, httpsCallable} from 'firebase/functions';

@Injectable()
export class RoundsService {

  protected roundsListUnsub: () => void;
  protected roundsOrderSub: Subscription;
  protected paramRoundIdSelectedSub: Subscription;
  protected nowSub: Subscription;
  isOnlineSub: Subscription;

  roundsList$: BehaviorSubject<Round[]> = new BehaviorSubject<Round[]>([]);
  roundSelected$: BehaviorSubject<Round> = new BehaviorSubject<Round>(null);
  paramRoundIdSelected$: BehaviorSubject<string> = new BehaviorSubject<string>(null);
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
  setRoundsOrderSub: Subscription;

  constructor(
    protected authService: AuthService,
    protected route: ActivatedRoute,
    protected connectionsService: ConnectionService,
    @Inject('FUNCTIONS') private readonly functions: Functions,
    @Inject('FIRESTORE') private readonly firestore: Firestore
  ) {
    this.isOnlineSub = this.connectionsService.isOnline$.subscribe((isOnline) => {
      if (!isOnline) {
        this.roundsOrderFirstLoading$.next(true);
        if (this.setRoundsOrderSub && !this.setRoundsOrderSub.closed) {
          this.setRoundsOrderSub.unsubscribe();
        }
      }
    });
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

    this.isOnlineSub.unsubscribe();

    if (this.roundsListUnsub) {
      this.roundsListUnsub();
      this.roundsListUnsub = undefined;
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
    this.roundsOrderFirstLoading$.next(true);
    this.todayFirstLoading$.next(true);
    this.tasksFirstLoading$.next(true);
    this.roundsListFirstLoad$.next(true);
    this.nowSub.unsubscribe();
  }

  protected runRoundsList(): void {

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

      const decryptedRoundList = await Promise.all(roundsDecryptPromise);

      for (const [i, doc] of snap.docs.entries()) {
        decryptedRoundList[i].id = doc.id;
      }

      this.roundsListFirstLoad$.next(false);
      this.generateLists(decryptedRoundList, this.roundsOrder$.value);
    });

    this.roundsOrderSub = this.authService.user$.subscribe((user) => {
      this.roundsOrderFirstLoading$.next(false);
      this.generateLists(this.roundsList$.value, user?.rounds);
    });
  }

  protected generateLists(roundsList: Round[], roundsOrder: string[]): void {
    this.roundsList$.next(roundsList);
    this.roundsOrder$.next(roundsOrder);
    this.checkSelectedRound(roundsList);
  }

  protected runParamRoundIdSelected(): void {
    this.paramRoundIdSelectedSub = this.paramRoundIdSelected$.pipe(filter((id) => id !== null)).subscribe((roundParamIdSelected) => {
      this.checkSelectedRound(this.roundsList$.value, roundParamIdSelected);
    });
  }

  protected checkSelectedRound(roundsList: Round[], roundId?: string): void {

    if (this.roundsListFirstLoad$.value || this.roundsOrderFirstLoading$.value) {
      return;
    }

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
      this.roundSelected$.value?.tasksIds.toSet().hasOnly(selectedRoundRoundsList?.todaysIds.toSet()) &&
      this.roundSelected$.value?.todaysIds.toSet().hasOnly(selectedRoundRoundsList?.todaysIds.toSet())
    ) {
      return;
    }

    if (roundsList && selectedRoundRoundsList) {
      this.roundSelected$.next(selectedRoundRoundsList);
    } else {
      this.roundSelected$.next(null);
    }
  }

  saveRound(name: string, roundId: string = 'null'): Observable<{roundId: string, details: string, created: boolean}> {
    return of(httpsCallable(this.functions, 'saveRound')({roundId, name})).pipe(
      mergeMap((e) => e),
      mergeMap(async (e) => e.data as {roundId: string, details: string, created: boolean})
    );
  }

  getRoundById$(roundId: string): Observable<Promise<Round | null>> {
    const user = this.authService.user$.value;

    return of(getDoc(
      doc(this.firestore, `users/${user.uid}/rounds/${roundId}`).withConverter(basicEncryptedValueConverter)
    )).pipe(
      mergeMap((e) => e),
      map(async (docSnap) => {
        const round = docSnap.data();
        if (round) {
          return await decryptRound(round, user.cryptoKey);
        }
        return null;
      })
    );
  }

  setRoundsOrder(data: {moveBy: number, roundId: string}): Observable<{[key: string]: string}> {
    return of(httpsCallable(this.functions, 'setRoundsOrder')(data)).pipe(
      mergeMap((e) => e),
      mergeMap(async (e) => e.data as {[key: string]: string})
    );
  }
}
