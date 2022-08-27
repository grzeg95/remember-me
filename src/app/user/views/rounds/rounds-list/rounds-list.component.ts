import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild
} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';
import {faEdit} from '@fortawesome/free-regular-svg-icons';
import {Subscription} from 'rxjs';
import {RouterDict} from '../../../../app.constants';
import {AuthService} from '../../../../auth/auth.service';
import {ConnectionService} from '../../../../connection.service';
import {Round} from '../../../models';
import {RoundsService} from '../rounds.service';

@Component({
  selector: 'app-rounds-list',
  templateUrl: './rounds-list.component.html',
  styleUrls: ['./rounds-list.component.scss']
})
export class RoundsListComponent implements OnInit, OnDestroy, AfterViewChecked {

  displayedColumns: string[] = ['roundName', 'tasks', 'timesOfDay', 'edit'];
  faEdit = faEdit;
  @ViewChild('roundListTableWrapper', {static: false}) roundListTableWrapper: ElementRef;

  roundsListSub: Subscription;
  roundsList: Round[];
  sortedRoundList: Round[];

  roundsOrderSub: Subscription;
  roundsOrder: string[];

  isOnlineSub: Subscription;
  isOnline: boolean;

  setRoundsOrderIsPending = false;
  roundsListFirstLoading$ = this.roundsService.roundsListFirstLoading$;

  selectedRound: Round;
  selectedRoundSub: Subscription;

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
    this.roundsListSub = this.roundsService.roundsList$.subscribe((roundsList) => {
      this.roundsList = roundsList;
      this.sortRoundList();
    });
    this.roundsOrderSub = this.authService.user$.subscribe((user) => {
      if (user) {
        this.roundsOrder = user.rounds;
        this.sortRoundList();
      }
    });
    this.isOnlineSub = this.connectionsService.isOnline$.subscribe((isOnline) => this.isOnline = isOnline);
    this.selectedRoundSub = this.roundsService.selectedRound$.subscribe((selectedRound) => this.selectedRound = selectedRound);
  }

  ngOnDestroy(): void {
    this.roundsListSub.unsubscribe();
    this.roundsOrderSub.unsubscribe();
    this.isOnlineSub.unsubscribe();
    this.selectedRoundSub.unsubscribe();
  }

  sortRoundList(): void {

    const roundsMap: { [key in string]: Round } = {};

    for (const round of this.roundsList || []) {
      roundsMap[round.id] = round;
    }

    this.sortedRoundList = (this.roundsOrder || []).filter((roundId) => roundsMap[roundId]).map((roundId) => roundsMap[roundId]);
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

    this.setRoundsOrderIsPending = true;
    const roundsOrder = this.roundsOrder;
    const moveBy = event.currentIndex - event.previousIndex;
    const roundId = roundsOrder[event.previousIndex];

    moveItemInArray(roundsOrder, event.previousIndex, event.currentIndex);
    this.sortRoundList();

    this.roundsService.setRoundsOrder({moveBy, roundId}).then((success) => {
      this.setRoundsOrderIsPending = false;
      this.snackBar.open(success.details || 'Your operation has been done 😉');
    }, (error) => {
      this.setRoundsOrderIsPending = false;
      this.snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
      moveItemInArray(roundsOrder, event.currentIndex, event.previousIndex);
      this.sortRoundList();
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
