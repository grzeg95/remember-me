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
import {ConnectionService} from 'services';
import {RouterDict} from '../../../../app.constants';
import {Round} from '../models';
import {RoundsService} from '../rounds.service';

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
  styleUrl: './rounds-list.component.scss'
})
export class RoundsListComponent implements AfterViewChecked {

  displayedColumns: string[] = ['roundName', 'tasks', 'timesOfDay', 'edit'];
  faEdit = faEdit;
  @ViewChild('roundListTableWrapper', {static: false}) roundListTableWrapper!: ElementRef;

  isOnline = this.connectionsService.isOnline;
  isRoundsOrderUpdating = signal<boolean>(false);
  roundsListFirstLoading = this.roundsService.roundsListFirstLoading;
  selectedRound = this.roundsService.selectedRound;
  roundsList = this.roundsService.roundsList;
  roundsOrder = this.roundsService.roundsOrder;

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
    private connectionsService: ConnectionService
  ) {
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

    this.isRoundsOrderUpdating.set(true);
    const roundsOrder = this.roundsOrder();
    const moveBy = event.currentIndex - event.previousIndex;
    const roundId = roundsOrder[event.previousIndex];

    moveItemInArray(roundsOrder, event.previousIndex, event.currentIndex);
    this.roundsOrder.set([...roundsOrder]);

    this.roundsService.setRoundsOrder({moveBy, roundId}).pipe(catchError((error) => {
      this.isRoundsOrderUpdating.set(false);
      this.snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
      moveItemInArray(roundsOrder, event.currentIndex, event.previousIndex);
      this.roundsOrder.set([...roundsOrder]);
      return NEVER;
    })).subscribe((success) => {
      this.isRoundsOrderUpdating.set(false);
      this.snackBar.open(success.details || 'Your operation has been done 😉');
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
              this.renderer.setStyle(cell, 'width', `${cell.offsetWidth}px`);
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
