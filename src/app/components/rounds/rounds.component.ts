import {Component, DestroyRef, effect, Inject, OnDestroy} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {Firestore, limit} from 'firebase/firestore';
import {catchError, of, Subscription, takeWhile} from 'rxjs';
import {RouterDict} from '../../app.constants';
import {FirestoreInjectionToken} from '../../models/firebase';
import {Round} from '../../models/round';
import {User} from '../../models/user';
import {AuthService} from '../../services/auth.service';
import {collectionSnapshots} from '../../services/firebase/firestore';
import {RoundsService} from '../../services/rounds.service';

@Component({
  selector: 'app-rounds',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './rounds.component.html',
  styleUrl: './rounds.component.scss'
})
export class RoundsComponent implements OnDestroy {

  protected readonly _round = toSignal(this._roundsService.round$);
  protected readonly _RouterDict = RouterDict;
  protected readonly _editRound = toSignal(this._roundsService.editRound$);

  protected readonly _user = toSignal(this._authService.user$);
  protected readonly _cryptoKey = toSignal(this._authService.cryptoKey$);

  private _roundsListSub: Subscription | undefined;

  private _ngOnInitRoundsSub: Subscription | undefined;

  constructor(
    private readonly _roundsService: RoundsService,
    private readonly _authService: AuthService,
    @Inject(FirestoreInjectionToken) private readonly _firestore: Firestore,
    private readonly _destroyRef: DestroyRef
  ) {

    // rounds
    let rounds_userId: string | undefined;
    effect(() => {

      const user = this._user();
      const cryptoKey = this._cryptoKey();

      if (!user || !cryptoKey) {
        this._roundsService.roundsMap$.next(undefined);
        rounds_userId = undefined;
        this._roundsListSub && !this._roundsListSub.closed && this._roundsListSub.unsubscribe();
        return;
      }

      if (
        rounds_userId === user.id
      ) {
        return;
      }

      rounds_userId = user.id;

      const userRef = User.ref(this._firestore, user.id);
      const roundsRef = Round.refs(userRef);

      this._roundsService.loadingRoundsMap$.next(true);
      this._roundsListSub && !this._roundsListSub.closed && this._roundsListSub.unsubscribe();
      this._roundsListSub = collectionSnapshots(roundsRef, limit(5)).pipe(
        takeUntilDestroyed(this._destroyRef),
        takeWhile(() => !!this._user()),
        catchError(() => of(null))
      ).subscribe(async (querySnapRounds) => {

        this._roundsService.loadingRoundsMap$.next(false);

        if (!querySnapRounds) {
          this._roundsService.roundsMap$.next(undefined);
          return;
        }

        const querySnapRoundsStatusesMap = new Map<string, Round>();

        for (const querySnapRound of querySnapRounds.docs) {
          querySnapRoundsStatusesMap.set(querySnapRound.id, await Round.data(querySnapRound, cryptoKey));
        }

        this._roundsService.roundsMap$.next(querySnapRoundsStatusesMap);
      });
    }, {allowSignalWrites: true});
  }

  ngOnDestroy(): void {
    this._ngOnInitRoundsSub?.unsubscribe();
    this._roundsService.roundsMap$.next(undefined);
    this._roundsService.loadingRoundsMap$.next(false);
  }
}
