import {Component, DestroyRef, effect, Inject, OnDestroy, ViewEncapsulation} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {Firestore, limit} from 'firebase/firestore';
import {catchError, of, Subscription, takeWhile} from 'rxjs';
import {RouterDict} from '../../app.constants';
import {SvgDirective} from '../../directives/svg.directive';
import {FirestoreInjectionToken} from '../../models/firebase';
import {Round} from '../../models/round';
import {User} from '../../models/user';
import {AuthService} from '../../services/auth.service';
import {collectionSnapshots} from '../../services/firebase/firestore';
import {RoundsService} from '../../services/rounds.service';
import {ThemeSelectorService} from '../../services/theme-selector.service';

@Component({
  selector: 'app-rounds',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SvgDirective],
  templateUrl: './rounds.component.html',
  styleUrl: './rounds.component.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'app-rounds'
  }
})
export class RoundsComponent implements OnDestroy {

  protected readonly _round = this._roundsService.roundSig.get();
  protected readonly _RouterDict = RouterDict;
  protected readonly _editedRound = this._roundsService.editedRoundSig.get();

  protected readonly _user = this._authService.userSig.get();
  protected readonly _cryptoKey = this._authService.cryptoKeySig.get();

  protected readonly _darkMode = this._themeSelectorService.darkModeSig.get();

  private _roundsListSub: Subscription | undefined;

  constructor(
    private readonly _roundsService: RoundsService,
    private readonly _authService: AuthService,
    @Inject(FirestoreInjectionToken) private readonly _firestore: Firestore,
    private readonly _destroyRef: DestroyRef,
    private readonly _themeSelectorService: ThemeSelectorService
  ) {

    // rounds
    let rounds_userId: string | undefined;
    effect(() => {

      const user = this._user();
      const cryptoKey = this._cryptoKey();

      if (!user || !cryptoKey) {
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

      const userRef = User.ref(this._firestore, user.id);
      const roundsRef = Round.refs(userRef);

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
