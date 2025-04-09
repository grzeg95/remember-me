import {AsyncPipe} from '@angular/common';
import {Component, DestroyRef, Inject, OnDestroy, OnInit} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router, RouterOutlet} from '@angular/router';
import {Firestore} from 'firebase/firestore';
import {catchError, combineLatest, of, Subscription, switchMap, takeWhile} from 'rxjs';
import {FirestoreInjectionToken} from '../../models/firebase';
import {Round, RoundDoc} from '../../models/round';
import {User} from '../../models/user';
import {AuthService} from '../../services/auth.service';
import {docSnapshots} from '../../services/firebase/firestore';
import {RoundsService} from '../../services/rounds.service';
import {RoundNavComponent} from '../round-nav/round-nav.component';

@Component({
  selector: 'app-round',
  standalone: true,
  imports: [
    RoundNavComponent,
    RouterOutlet,
    AsyncPipe
  ],
  templateUrl: './round.component.html'
})
export class RoundComponent implements OnInit, OnDestroy {

  protected readonly _loadingRound$ = this._roundsService.loadingRound$;

  protected readonly _round$ = this._roundsService.round$;
  private _roundSub: Subscription | undefined;

  protected readonly _roundId$ = this._roundsService.roundId$;

  protected readonly _user$ = this._authService.user$;
  protected readonly _cryptoKey$ = this._authService.cryptoKey$;

  private _ngOnInitRoundSub: Subscription | undefined;

  constructor(
    private readonly _activatedRoute: ActivatedRoute,
    private readonly _roundsService: RoundsService,
    private readonly _authService: AuthService,
    private readonly _router: Router,
    @Inject(FirestoreInjectionToken) private readonly _firestore: Firestore,
    private readonly _destroyRef: DestroyRef
  ) {

    this._activatedRoute.paramMap.subscribe(
      (params) => this._roundsService.roundId$.next(params.get('id'))
    );
  }

  ngOnInit() {

    // round
    let round_userId: string | undefined;
    let round_boardId: string | undefined;
    this._ngOnInitRoundSub = combineLatest([
      this._user$,
      this._cryptoKey$,
      this._roundId$
    ]).subscribe(([user, cryptoKey, roundId]) => {

      if (user === undefined || roundId === undefined || !cryptoKey) {
        return;
      }

      if (!user || !roundId) {
        this._router.navigate(['/']);
        this._roundsService.round$.next(undefined);
        round_userId = undefined;
        round_boardId = undefined;
        this._roundSub && !this._roundSub.closed && this._roundSub.unsubscribe();
        return;
      }

      if (
        round_userId === user.id &&
        round_boardId === roundId
      ) {
        return;
      }

      round_userId = user.id;
      round_boardId = roundId;

      const userRef = User.ref(this._firestore, user.id);
      const roundRef = Round.ref(userRef, roundId);

      this._roundsService.loadingRound$.next(true);
      this._roundSub && !this._roundSub.closed && this._roundSub.unsubscribe();
      this._roundSub = docSnapshots<Round, RoundDoc>(roundRef).pipe(
        takeUntilDestroyed(this._destroyRef),
        takeWhile(() => !!this._roundId$.value),
        switchMap((docSnap) => Round.data(docSnap, cryptoKey)),
        catchError(() => of(null))
      ).subscribe((round) => {

        this._roundsService.loadingRound$.next(false);

        if (!round || !round.exists) {
          this._roundsService.round$.next(undefined);
          this._roundsService.roundId$.next(undefined);
          round_userId = undefined;
          round_boardId = undefined;
          this._roundSub && !this._roundSub.closed && this._roundSub.unsubscribe();
          return;
        }

        this._roundsService.round$.next(round);
      });
    });
  }

  ngOnDestroy(): void {
    this._ngOnInitRoundSub?.unsubscribe();
    this._roundsService.roundId$.next(undefined);
    this._roundsService.round$.next(undefined);
  }
}
