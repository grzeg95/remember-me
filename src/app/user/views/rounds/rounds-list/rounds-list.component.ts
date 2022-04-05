import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {AfterViewChecked, Component, ElementRef, HostListener, NgZone, Renderer2, ViewChild} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Observable, Subscription} from 'rxjs';
import {AppService} from '../../../../app-service';
import {RoundsService} from '../rounds.service';
import {ActivatedRoute, Router} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {RouterDict} from '../../../../app.constants';
import {Round} from '../../../models';
import {faEdit} from '@fortawesome/free-regular-svg-icons';

@Component({
  selector: 'app-rounds-list',
  templateUrl: './rounds-list.component.html',
  styleUrls: ['./rounds-list.component.scss']
})
export class RoundsListComponent implements AfterViewChecked {

  set setRoundsOrderSub(setTimesOfDayOrderSub: Subscription) {
    this.roundsService.setRoundsOrderSub = setTimesOfDayOrderSub;
  }

  get setRoundsOrderSub(): Subscription {
    return this.roundsService.setRoundsOrderSub;
  }

  get isOnline$(): Observable<boolean> {
    return this.appService.isOnline$;
  }

  get roundsListFirstLoad$(): Observable<boolean> {
    return this.roundsService.roundsListFirstLoad$;
  }

  get roundsOrderFirstLoading$(): Observable<boolean> {
    return this.roundsService.roundsOrderFirstLoading$;
  }

  displayedColumns: string[] = ['roundName', 'tasks', 'timesOfDay', 'edit'];
  faEdit = faEdit;
  @ViewChild('roundListTableWrapper', {static: false}) roundListTableWrapper: ElementRef;

  get roundsList$(): Observable<Round[]> {
    return this.roundsService.roundsList$;
  }

  get roundsOrder$(): Observable<string[]> {
    return this.roundsService.roundsOrder$;
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.applyCellsWidths();
  }

  constructor(
    protected roundsService: RoundsService,
    protected router: Router,
    public dialog: MatDialog,
    protected route: ActivatedRoute,
    protected appService: AppService,
    protected zone: NgZone,
    protected snackBar: MatSnackBar,
    protected renderer: Renderer2
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

  sortRoundList(rounds: Round[], roundsOrder: string[]): Round[] {

    const roundsMap: { [key in string]: Round } = {};

    for (const round of rounds) {
      roundsMap[round.id] = round;
    }

    return roundsOrder.filter((roundId) => roundsMap[roundId]).map((roundId) => roundsMap[roundId]);
  }

  drop(event: CdkDragDrop<any, any>): void {

    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const roundsOrder = this.roundsService.roundsOrder$.value;
    const moveBy = event.currentIndex - event.previousIndex;
    const roundId = roundsOrder[event.previousIndex];

    moveItemInArray(roundsOrder, event.previousIndex, event.currentIndex);
    this.roundsService.roundsOrder$.next(roundsOrder);

    this.setRoundsOrderSub = this.roundsService.setRoundsOrder({moveBy, roundId}).subscribe((success) => {
      this.zone.run(() => {
        this.snackBar.open(success.details || 'Your operation has been done 😉');
      });
    }, (error) => {
      this.zone.run(() => {
        this.snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
        moveItemInArray(roundsOrder, event.currentIndex, event.previousIndex);
        this.roundsService.roundsOrder$.next(roundsOrder);
      });
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
