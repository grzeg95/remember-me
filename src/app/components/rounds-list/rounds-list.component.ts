import {CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray} from '@angular/cdk/drag-drop';
import {NgTemplateOutlet} from '@angular/common';
import {AfterViewChecked, Component, ElementRef, HostListener, Renderer2, signal, ViewChild} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatDialog} from '@angular/material/dialog';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatTableModule} from '@angular/material/table';
import {ActivatedRoute, Router} from '@angular/router';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faEdit} from '@fortawesome/free-regular-svg-icons';
import {catchError, NEVER} from 'rxjs';
import {fadeZoomInOutTrigger} from '../../animations/fade-zoom-in-out.trigger';
import {RouterDict} from '../../app.constants';
import {Round} from '../../models/round';
import {AuthService} from '../../services/auth.service';
import {ConnectionService} from '../../services/connection.service';
import {RoundsService} from '../../services/rounds.service';
import {Sig} from '../../utils/Sig';

@Component({
  selector: 'app-rounds-list',
  standalone: true,
  templateUrl: './rounds-list.component.html',
  imports: [
    MatProgressBarModule,
    MatTableModule,
    CdkDropList,
    FontAwesomeModule,
    MatButtonModule,
    CdkDrag,
    MatProgressSpinnerModule,
    NgTemplateOutlet
  ],
  styleUrl: './rounds-list.component.scss',
  animations: [
    fadeZoomInOutTrigger
  ]
})
export class RoundsListComponent implements AfterViewChecked {

  protected readonly _displayedColumns: string[] = ['roundName', 'tasks', 'timesOfDay', 'edit'];
  protected readonly _faEdit = faEdit;
  @ViewChild('roundListTableWrapper', {static: false}) roundListTableWrapper!: ElementRef;

  protected readonly _isOnline = this._connectionsService.isOnlineSig.get();

  private readonly _loadingSig = new Sig<boolean>(false);
  protected readonly _loading = this._loadingSig.get();

  protected readonly _loadingRoundsMap = this._roundsService.loadingRoundsMapSig.get();

  protected readonly _round = this._roundsService.roundSig.get();

  protected readonly _roundsList = this._roundsService.roundsList;
  protected readonly _roundsOrder = this._roundsService.roundsOrder;

  protected readonly _loadingUser = this._authService.loadingUserSig.get();

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.applyCellsWidths();
  }

  constructor(
    private readonly _roundsService: RoundsService,
    private readonly _router: Router,
    public readonly dialog: MatDialog,
    private readonly _route: ActivatedRoute,
    private readonly _snackBar: MatSnackBar,
    private readonly _renderer: Renderer2,
    private readonly _connectionsService: ConnectionService,
    private readonly _authService: AuthService
  ) {
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

    this._loadingSig.set(true);
    const moveBy = event.currentIndex - event.previousIndex;
    const roundId = roundsOrder[event.previousIndex];

    moveItemInArray(roundsOrder, event.previousIndex, event.currentIndex);
    this._roundsService.roundsOrderUpdatedSig.set([...roundsOrder]);

    this._roundsService.setRoundsOrder({moveBy, roundId}).pipe(catchError((error) => {
      this._loadingSig.set(false);
      this._snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
      moveItemInArray(roundsOrder, event.currentIndex, event.previousIndex);
      this._roundsService.roundsOrderUpdatedSig.set([...roundsOrder]);
      return NEVER;
    })).subscribe((success) => {
      this._loadingSig.set(false);
      this._snackBar.open(success.details || 'Your operation has been done 😉');
    });
  }

  applyCellsWidths(): void {
    if (this.roundListTableWrapper) {

      const elements: HTMLElement[] = Array.from(this.roundListTableWrapper.nativeElement.children);
      const table = elements.find((e: HTMLElement) => e.classList.contains('rounds-list')) as HTMLTableElement;

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

  ngAfterViewChecked(): void {
    this.applyCellsWidths();
  }

  trackRoundList(index: number, item: Round) {
    return item.id;
  }
}
