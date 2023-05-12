import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  Renderer2,
  signal,
  ViewChild
} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';
import {faEdit} from '@fortawesome/free-regular-svg-icons';
import {AuthService} from 'auth';
import {catchError, map, NEVER, Subscription} from 'rxjs';
import {ConnectionService} from 'services';
import {RouterDict} from '../../../../app.constants';
import {Round} from '../../../models';
import {RoundsService} from '../rounds.service';

@Component({
  selector: 'app-rounds-list',
  templateUrl: './rounds-list.component.html',
  styleUrls: ['./rounds-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoundsListComponent implements OnInit, OnDestroy, AfterViewChecked {

  displayedColumns: string[] = ['roundName', 'tasks', 'timesOfDay', 'edit'];
  faEdit = faEdit;
  @ViewChild('roundListTableWrapper', {static: false}) roundListTableWrapper: ElementRef;

  roundsList = toSignal(this.roundsService.roundsList$);
  sortedRoundList = computed(() => {
    const roundsMap: { [key in string]: Round } = {};

    for (const round of this.roundsList() || []) {
      roundsMap[round.id] = round;
    }

    return (this.roundsOrder() || []).filter((roundId) => roundsMap[roundId]).map((roundId) => roundsMap[roundId]);
  });
  roundsOrder = signal([]);
  isOnline = toSignal(this.connectionsService.isOnline$);
  selectedRound = toSignal(this.roundsService.selectedRound$);
  setRoundsOrderIsPending = signal(false);
  roundsListFirstLoading = toSignal(this.roundsService.roundsListFirstLoading$);

  roundsOrderSub: Subscription;

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.applyCellsWidths();
  }

  constructor(
    private roundsService: RoundsService,
    private router: Router,
    public dialog: MatDialog,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private renderer: Renderer2,
    private authService: AuthService,
    private connectionsService: ConnectionService
  ) {
  }

  ngOnInit(): void {
    this.roundsService.runRoundsList();

    this.roundsOrderSub = this.authService.user$.pipe(
      map((user) => (user && user.rounds) || [])
    ).subscribe((roundsOrder) => {
      this.roundsOrder.set(roundsOrder);
    });
  }

  ngOnDestroy(): void {
    this.roundsOrderSub.unsubscribe();
  }

  addRound(): void {
    this.router.navigate(['../', RouterDict.roundEditor], {relativeTo: this.route});
  }

  editRound(round: Round): void {
    this.router.navigate(['../', RouterDict.roundEditor, round.id], {relativeTo: this.route});
  }

  goToRound(roundId: string): void {
    this.router.navigate(['../', roundId, RouterDict.todayTasks], {relativeTo: this.route});
  }

  drop(event: CdkDragDrop<any, any>): void {

    if (event.previousIndex === event.currentIndex) {
      return;
    }

    this.setRoundsOrderIsPending.set(true);
    const moveBy = event.currentIndex - event.previousIndex;

    const roundsOrderCopy = this.roundsOrder();
    const roundId = this.roundsOrder()[event.previousIndex];

    moveItemInArray(roundsOrderCopy, event.previousIndex, event.currentIndex);
    this.roundsOrder.set(roundsOrderCopy);

    this.roundsService.setRoundsOrder({moveBy, roundId}).pipe(catchError((error) => {
      this.setRoundsOrderIsPending.set(false);
      this.snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
      moveItemInArray(roundsOrderCopy, event.currentIndex, event.previousIndex);
      this.roundsOrder.set(roundsOrderCopy);

      return NEVER;
    })).subscribe((success) => {
      this.setRoundsOrderIsPending.set(false);
      this.snackBar.open(success.details || 'Your operation has been done 😉');
    });
  }

  applyCellsWidths(): void {
    if (this.roundListTableWrapper) {

      const elements = Array.from(this.roundListTableWrapper.nativeElement.children);
      const table = elements.find((e: HTMLElement) => e.classList.contains('rounds-list')) as HTMLTableElement;

      if (table) {
        for (const row of Array.from(table.rows) as HTMLTableRowElement[]) {
          for (let i = 0; i < row.cells.length - 1; ++i) {
            const cell = row.cells.item(i);
            this.renderer.setStyle(cell, 'width', `${cell.offsetWidth}px`);
          }
        }
      }
    }
  }

  ngAfterViewChecked(): void {
    this.applyCellsWidths();
  }
}
