import {Dialog} from '@angular/cdk/dialog';
import {CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray} from '@angular/cdk/drag-drop';
import {NgStyle, NgTemplateOutlet} from '@angular/common';
import {
  AfterViewChecked,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  HostListener,
  inject,
  Renderer2,
  signal,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router} from '@angular/router';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faEdit} from '@fortawesome/free-regular-svg-icons';
import {limit} from 'firebase/firestore';
import {catchError, NEVER, of, Subscription, takeWhile} from 'rxjs';
import {getRoundRefs, Round} from '../../models/firestore/Round';
import {getFirestoreUserRef} from '../../models/firestore/User';
import {RouterDict} from '../../models/router-dict';
import {Auth} from '../../services/auth';
import {Connection} from '../../services/connection';
import {Rounds} from '../../services/rounds';
import {FirestoreInjectionToken} from '../../tokens/firebase';
import {Button} from '../../ui/button/button';
import {SkeletonComponent} from '../../ui/skeleton/skeleton.component';
import {SnackBar} from '../../ui/snack-bar/snack-bar';
import {collectionSnapshots} from '../../utils/firestore';

@Component({
  selector: 'app-rounds-list',
  standalone: true,
  templateUrl: './rounds-list.html',
  imports: [
    CdkDropList,
    FontAwesomeModule,
    CdkDrag,
    NgTemplateOutlet,
    SkeletonComponent,
    NgStyle,
    Button
  ],
  styleUrl: './rounds-list.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'app-rounds-list'
  }
})
export class RoundsList implements AfterViewChecked {

  public readonly dialog = inject(Dialog);
  private readonly _firestore = inject(FirestoreInjectionToken);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _rounds = inject(Rounds);
  private readonly _router = inject(Router);
  private readonly _route = inject(ActivatedRoute);
  private readonly _snackBar = inject(SnackBar);
  private readonly _renderer = inject(Renderer2);
  private readonly _connections = inject(Connection);
  private readonly _auth = inject(Auth);

  protected readonly _faEdit = faEdit;
  @ViewChild('roundListTable', {static: false}) roundListTable!: ElementRef;

  protected readonly _isOnline = toSignal(this._connections.isOnline$);

  protected readonly _user = toSignal(this._auth.firestoreUser$);

  private readonly _loadingOrder = signal<boolean>(false);

  protected readonly _selectedRound = toSignal(this._rounds.selectedRound$);

  protected readonly _roundsOrderUpdated = toSignal(this._rounds.roundsOrderUpdated$);

  protected readonly _roundsMap = toSignal(this._rounds.roundsMap$);

  protected readonly _roundsOrder = computed(() => {

    const user = this._user();
    const roundsOrderUpdated = this._roundsOrderUpdated();

    if (!user) {
      return undefined;
    }

    if (roundsOrderUpdated) {
      setTimeout(() => {
        this._rounds.roundsOrderUpdated$.next(null);
      });
      return roundsOrderUpdated;
    }

    return user.roundsIds || [];
  });

  protected readonly _userInitialized = toSignal(this._auth.userInitialized$);

  private _roundsMapSub: Subscription | undefined;

  protected readonly _roundsList = computed(() => {

    const roundsOrder = this._roundsOrder();
    const roundsMap = this._roundsMap();

    if (!roundsOrder || !roundsMap) {
      return undefined;
    }

    return roundsOrder.filter((roundId) => roundsMap.get(roundId)).map((roundId) => roundsMap.get(roundId)) as Round[];
  });

  @HostListener('window:resize')
  onResize() {
    setTimeout(() => this._updateCellsWidths());
  }

  constructor() {

    effect(() => {
      if (this._roundsList()) {
        setTimeout(() => this._updateCellsWidths());
      }
    });

    // rounds
    let rounds_userUId: string | undefined;
    effect(() => {

      const user = this._user();

      if (!user) {
        this._rounds.roundsMap$.next(undefined);
        rounds_userUId = undefined;
        this._roundsMapSub && !this._roundsMapSub.closed && this._roundsMapSub.unsubscribe();
        return;
      }

      if (
        rounds_userUId === user.uid
      ) {
        return;
      }

      rounds_userUId = user.uid;

      const userRef = getFirestoreUserRef(this._firestore, user.uid);
      const roundsRef = getRoundRefs(userRef);

      this._rounds.loadingRoundsMap$.next(true);
      this._roundsMapSub && !this._roundsMapSub.closed && this._roundsMapSub.unsubscribe();
      this._roundsMapSub = collectionSnapshots(roundsRef, limit(5)).pipe(
        takeUntilDestroyed(this._destroyRef),
        takeWhile(() => !!this._user()),
        catchError(() => of(null))
      ).subscribe(async (querySnapRounds) => {

        this._rounds.loadingRoundsMap$.next(false);

        if (!querySnapRounds) {
          this._rounds.roundsMap$.next(undefined);
          return;
        }

        const querySnapRoundsStatusesMap = new Map<string, Round>();

        for (const querySnapRound of querySnapRounds.docs) {
          querySnapRoundsStatusesMap.set(querySnapRound.id, querySnapRound.data());
        }

        this._rounds.roundsMap$.next(querySnapRoundsStatusesMap);
      });
    });
  }

  addRound(): void {
    this._router.navigate(['../', RouterDict.roundEditor], {relativeTo: this._route});
  }

  editRound(round: Round): void {
    this._router.navigate(['../', RouterDict.roundEditor, round.id], {relativeTo: this._route});
  }

  goToRound(roundId: string): void {
    this._router.navigate(['../', roundId, RouterDict.todayTasks], {relativeTo: this._route});
  }

  drop(event: CdkDragDrop<any, any>): void {

    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const roundsOrder = this._roundsOrder();

    if (!roundsOrder) {
      return;
    }

    this._loadingOrder.set(true);
    const move = event.currentIndex - event.previousIndex;
    const roundId = roundsOrder[event.previousIndex];

    moveItemInArray(roundsOrder, event.previousIndex, event.currentIndex);
    this._rounds.roundsOrderUpdated$.next([...roundsOrder]);

    this._rounds.moveRound({move, round: {id: roundId}}).pipe(catchError((error) => {
      this._loadingOrder.set(false);
      this._snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
      moveItemInArray(roundsOrder, event.currentIndex, event.previousIndex);
      this._rounds.roundsOrderUpdated$.next([...roundsOrder]);
      return NEVER;
    })).subscribe((success) => {
      this._loadingOrder.set(false);
      this._snackBar.open(success.data.details || 'Your operation has been done 😉');
    });
  }

  ngAfterViewChecked(): void {
    this._updateCellsWidths();
  }

  private _updateCellsWidths(): void {

    if (this.roundListTable) {

      const table = this.roundListTable.nativeElement as HTMLTableElement;

      if (table) {
        for (const row of Array.from(table.rows) as HTMLTableRowElement[]) {
          for (let i = 0; i < row.cells.length - 1; ++i) {
            const cell = row.cells.item(i);
            if (cell) {
              this._renderer.setStyle(cell, 'width', `${cell.offsetWidth}px`);
            }
          }
        }
      }
    }
  }
}
