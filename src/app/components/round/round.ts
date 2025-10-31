import {Component, DestroyRef, effect, inject, OnDestroy, OnInit} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router, RouterOutlet} from '@angular/router';
import {catchError, map, Subscription, takeWhile} from 'rxjs';
import {getRoundRef} from '../../models/firestore/Round';
import {getFirestoreUserRef} from '../../models/firestore/User';
import {Auth} from '../../services/auth';
import {Rounds} from '../../services/rounds';
import {FirestoreInjectionToken} from '../../tokens/firebase';
import {docSnapshots} from '../../utils/firestore';
import {RoundNav} from '../round-nav/round-nav';

@Component({
  selector: 'app-round',
  standalone: true,
  imports: [
    RoundNav,
    RouterOutlet
  ],
  templateUrl: './round.html'
})
export class Round implements OnInit, OnDestroy {

  private readonly _activatedRoute = inject(ActivatedRoute);
  private readonly _rounds = inject(Rounds);
  private readonly _auth = inject(Auth);
  private readonly _router = inject(Router);
  private readonly _firestore = inject(FirestoreInjectionToken);
  private readonly _destroyRef = inject(DestroyRef);

  protected readonly _selectedRound = toSignal(this._rounds.selectedRound$);
  private _roundSub: Subscription | undefined;

  protected readonly _selectedRoundId = toSignal(this._rounds.selectedRoundId$);

  protected readonly _user = toSignal(this._auth.firestoreUser$);

  constructor() {

    // round
    let round_userId: string | undefined;
    let round_selectedRoundId: string | undefined;
    effect(() => {

      const user = this._user();
      const selectedRoundId = this._selectedRoundId();

      if (user === undefined || selectedRoundId === undefined) {
        return;
      }

      if (!user || !selectedRoundId) {
        this._router.navigate(['/']);
        this._rounds.selectedRound$.next(undefined);
        round_userId = undefined;
        round_selectedRoundId = undefined;
        this._roundSub && !this._roundSub.closed && this._roundSub.unsubscribe();
        return;
      }

      if (
        round_userId === user.uid &&
        round_selectedRoundId === selectedRoundId
      ) {
        return;
      }

      round_userId = user.uid;
      round_selectedRoundId = selectedRoundId;

      const userRef = getFirestoreUserRef(this._firestore, user.uid);
      const roundRef = getRoundRef(userRef, round_selectedRoundId);

      this._rounds.loadingSelectedRound$.next(true);
      this._roundSub && !this._roundSub.closed && this._roundSub.unsubscribe();
      this._roundSub = docSnapshots(roundRef).pipe(
        takeUntilDestroyed(this._destroyRef),
        takeWhile(() => !!this._selectedRoundId()),
        map((docSnap) => docSnap.data()),
        catchError((e) => {
          console.error(e);
          throw e;
        }),
      ).subscribe((round) => {

        this._rounds.loadingSelectedRound$.next(false);

        if (!round) {
          this._rounds.selectedRound$.next(undefined);
          this._rounds.selectedRoundId$.next(undefined);
          round_userId = undefined;
          round_selectedRoundId = undefined;
          this._roundSub && !this._roundSub.closed && this._roundSub.unsubscribe();
          return;
        }

        this._rounds.selectedRound$.next(round);
      });
    });
  }

  ngOnInit(): void {
    this._activatedRoute.paramMap.subscribe(
      (params) => this._rounds.selectedRoundId$.next(params.get('id'))
    );
  }

  ngOnDestroy(): void {
    this._rounds.selectedRound$.next(undefined);
    this._rounds.selectedRoundId$.next(undefined);
  }
}
