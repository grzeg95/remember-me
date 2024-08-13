import {Component, DestroyRef, effect, Inject, OnDestroy} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router, RouterOutlet} from '@angular/router';
import {DocumentReference, Firestore} from 'firebase/firestore';
import {catchError, map, of, Subscription, switchMap, takeWhile} from 'rxjs';
import {FirestoreInjectionToken} from '../../models/firebase';
import {Round, RoundDoc} from '../../models/round';
import {User} from '../../models/user';
import {AuthService} from '../../services/auth.service';
import {RoundsService} from '../../services/rounds.service';
import {docSnapshots} from '../../utils/firestore';
import {Sig} from '../../utils/sig';
import {RoundNavComponent} from '../round-nav/round-nav.component';

@Component({
  selector: 'app-round',
  standalone: true,
  imports: [
    RoundNavComponent,
    RouterOutlet
  ],
  templateUrl: './round.component.html'
})
export class RoundComponent implements OnDestroy {

  protected readonly _loadingRound = this._roundsService.loadingRoundSig.get();

  protected readonly _round = this._roundsService.roundSig.get();
  private _roundSub: Subscription | undefined;

  protected readonly _roundId = this._roundsService.roundIdSig.get();

  protected readonly _user = this._authService.userSig.get();
  protected readonly _authStateReady = this._authService.authStateReady;
  readonly loadedSig = new Sig(false);
  protected readonly _loaded = this.loadedSig.get();

  constructor(
    private readonly _activatedRoute: ActivatedRoute,
    private readonly _roundsService: RoundsService,
    private readonly _authService: AuthService,
    private readonly _router: Router,
    @Inject(FirestoreInjectionToken) private readonly _firestore: Firestore,
    private readonly _destroyRef: DestroyRef
  ) {

    this._activatedRoute.params.pipe(
      map((params) => params['id'])
    ).subscribe((id) => {

      const loaded = this._loaded();

      if (loaded) {
        this.loadedSig.set(false);
        return;
      }

      const authStateReady = this._authStateReady();
      const user = this._user();

      if (loaded && authStateReady && !user) {
        this._router.navigate(['/']);
        return;
      }

      this._roundsService.roundIdSig.set(id);
    });

    effect(() => {

      const loadingRound = this._loadingRound();

      const round = this._round();

      if (loadingRound) {
        return;
      }

      if (!round) {
        this.loadedSig.set(true);
        this._router.navigate(['/']);
      }
    });

    // round
    let round_userId: string | undefined;
    let round_boardId: string | undefined;
    effect(() => {

      const user = this._user();
      const roundId = this._roundId();

      if (!user || !roundId) {
        this._router.navigate(['/']);
        this._roundsService.roundSig.set(undefined);
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

      const cryptoKey = user.cryptoKey;

      const userRef = User.ref(this._firestore, user.id);
      const roundRef = Round.ref(userRef, roundId) as DocumentReference<Round, RoundDoc>;

      this._roundsService.loadingRoundSig.set(true);
      this._roundSub && !this._roundSub.closed && this._roundSub.unsubscribe();
      this._roundSub = docSnapshots<Round, RoundDoc>(roundRef).pipe(
        takeUntilDestroyed(this._destroyRef),
        takeWhile(() => !!this._roundId()),
        switchMap((docSnap) => Round.data(docSnap, cryptoKey)),
        catchError(() => of(null))
      ).subscribe((round) => {

        this._roundsService.loadingRoundSig.set(false);

        if (!round || !round.exists) {
          this._roundsService.roundSig.set(undefined);
          this._roundsService.roundIdSig.set(undefined);
          round_userId = undefined;
          round_boardId = undefined;
          this._roundSub && !this._roundSub.closed && this._roundSub.unsubscribe();
          return;
        }

        this._roundsService.roundSig.set(round);
      });
    });
  }

  ngOnDestroy(): void {
    this._roundsService.roundIdSig.set(undefined);
    this._roundsService.roundSig.set(undefined);
  }
}
