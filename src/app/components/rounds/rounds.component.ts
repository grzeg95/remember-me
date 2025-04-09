import {AsyncPipe} from '@angular/common';
import {Component, DestroyRef, Inject, OnDestroy} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {Firestore, limit} from 'firebase/firestore';
import {catchError, combineLatest, of, Subscription} from 'rxjs';
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
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe],
  templateUrl: './rounds.component.html',
  styleUrl: './rounds.component.scss'
})
export class RoundsComponent implements OnDestroy {

  protected readonly _round$ = this._roundsService.round$;
  protected readonly _RouterDict = RouterDict;
  protected readonly _editRound$ = this._roundsService.editRound$;

  protected readonly _user$ = this._authService.user$;
  protected readonly _cryptoKey$ = this._authService.cryptoKey$;

  private _roundsListSub: Subscription | undefined;

  constructor(
    private readonly _roundsService: RoundsService,
    private readonly _authService: AuthService,
    @Inject(FirestoreInjectionToken) private readonly _firestore: Firestore,
    private readonly _destroyRef: DestroyRef
  ) {

    // rounds
    let rounds_userId: string | undefined;

    combineLatest([
      this._user$,
      this._cryptoKey$
    ]).pipe(
      takeUntilDestroyed(this._destroyRef)
    ).subscribe(([user, cryptoKey]) => {

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
    });
  }

  ngOnDestroy(): void {
    this._roundsService.roundsMap$.next(undefined);
    this._roundsService.loadingRoundsMap$.next(false);
  }
}
