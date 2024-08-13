import {Component, DestroyRef, effect, Inject} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {CollectionReference, Firestore, limit} from 'firebase/firestore';
import {catchError, of, Subscription, takeWhile} from 'rxjs';
import {RouterDict} from '../../app.constants';
import {FirestoreInjectionToken} from '../../models/firebase';
import {Round, RoundDoc} from '../../models/round';
import {User} from '../../models/user';
import {AuthService} from '../../services/auth.service';
import {RoundsService} from '../../services/rounds.service';
import {collectionSnapshots} from '../../utils/firestore';

@Component({
  selector: 'app-rounds',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './rounds.component.html',
  styleUrl: './rounds.component.scss'
})
export class RoundsComponent {

  protected readonly _round = this._roundsService.roundSig.get();
  protected readonly _RouterDict = RouterDict;
  protected readonly _editRound = this._roundsService.editRoundSig.get();

  protected readonly _user = this._authService.userSig.get();

  private _roundsListSub: Subscription | undefined;

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

      if (!user) {
        this._roundsService.roundsMapSig.set(undefined);
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

      const cryptoKey = user.cryptoKey;

      const userRef = User.ref(this._firestore, user.id);
      const roundsRef = Round.ref(userRef) as CollectionReference<Round, RoundDoc>;

      this._roundsService.loadingRoundsMapSig.set(true);
      this._roundsListSub && !this._roundsListSub.closed && this._roundsListSub.unsubscribe();
      this._roundsListSub = collectionSnapshots(roundsRef, limit(5)).pipe(
        takeUntilDestroyed(this._destroyRef),
        takeWhile(() => !!this._user()),
        catchError(() => of(null))
      ).subscribe(async (querySnapRounds) => {

        this._roundsService.loadingRoundsMapSig.set(false);

        if (!querySnapRounds) {
          this._roundsService.roundsMapSig.set(undefined);
          return;
        }

        const querySnapRoundsStatusesMap = new Map<string, Round>();

        for (const querySnapRound of querySnapRounds.docs) {
          querySnapRoundsStatusesMap.set(querySnapRound.id, await Round.data(querySnapRound, cryptoKey));
        }

        this._roundsService.roundsMapSig.set(querySnapRoundsStatusesMap);
      });
    });
  }

  ngOnDestroy(): void {
    this._roundsService.roundsMapSig.set(undefined);
    this._roundsService.loadingRoundsMapSig.set(false);
  }
}
