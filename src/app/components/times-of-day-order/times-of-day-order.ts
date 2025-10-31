import {CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray} from '@angular/cdk/drag-drop';
import {NgTemplateOutlet} from '@angular/common';
import {
  Component,
  effect,
  ElementRef,
  HostListener,
  inject,
  Renderer2,
  signal,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router} from '@angular/router';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faGripLines} from '@fortawesome/free-solid-svg-icons';
import {catchError, NEVER} from 'rxjs';
import {RouterDict} from '../../models/router-dict';
import {Connection} from '../../services/connection';
import {Rounds} from '../../services/rounds';
import {Button} from '../../ui/button/button';
import {Loader} from '../../ui/loader/loader';
import {LoaderDefer} from '../../ui/loader/loader-defer/loader-defer';
import {LoaderLoading} from '../../ui/loader/loader-loading/loader-loading';
import {SkeletonComponent} from '../../ui/skeleton/skeleton.component';
import {SnackBar} from '../../ui/snack-bar/snack-bar';

@Component({
  selector: 'app-times-of-day-order',
  standalone: true,
  templateUrl: './times-of-day-order.html',
  imports: [
    CdkDropList,
    FontAwesomeModule,
    CdkDrag,
    NgTemplateOutlet,
    SkeletonComponent,
    Button,
    Loader,
    LoaderLoading,
    LoaderDefer,
  ],
  styleUrls: ['./times-of-day-order.scss'],
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'app-times-of-day-order'
  }
})
export class TimesOfDayOrder {

  private readonly _rounds = inject(Rounds);
  private readonly _snackBar = inject(SnackBar);
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _connection = inject(Connection);
  private readonly _renderer = inject(Renderer2);

  protected readonly _selectedRound = toSignal(this._rounds.selectedRound$);
  protected readonly _loadingSelectedRound = toSignal(this._rounds.loadingSelectedRound$);
  protected readonly _isOnline = toSignal(this._connection.isOnline$);
  protected readonly _isLoading = signal<boolean>(false);

  @ViewChild('timesOfDays', {static: false}) timesOfDays!: ElementRef;

  protected readonly _faGripLines = faGripLines;

  @HostListener('window:resize')
  onResize() {
    setTimeout(() => this._updateListCellsWidths());
  }

  constructor() {
    effect(() => {
      if (this._selectedRound()) {
        setTimeout(() => this._updateListCellsWidths());
      }
    });
  }

  drop(event: CdkDragDrop<string[]>): void {

    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const order = this._selectedRound()!.timesOfDay;
    const timeOfDay = order[event.previousIndex];
    const move = event.currentIndex - event.previousIndex;

    moveItemInArray(order, event.previousIndex, event.currentIndex);

    const selectedRound = this._selectedRound()!;
    this._rounds.selectedRound$.next({
      ...selectedRound,
      timesOfDay: order
    });

    this._isLoading.set(true);
    this._rounds.moveTimesOfDay({
      timeOfDay,
      move,
      round: {
        id: this._selectedRound()!.id,
      }
    }).pipe(catchError((error) => {

      this._isLoading.set(false);
      this._snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');

      moveItemInArray(order, event.currentIndex, event.previousIndex);

      const selectedRound = this._selectedRound()!;
      this._rounds.selectedRound$.next({
        ...selectedRound,
        timesOfDay: order
      });

      return NEVER;
    })).subscribe((success) => {
      this._isLoading.set(false);
      this._snackBar.open(success.data.details || 'Your operation has been done 😉');
    });
  }

  addNewTask(): void {
    this._router.navigate(['../', RouterDict.taskEditor], {relativeTo: this._route});
  }

  private _updateListCellsWidths(): void {

    if (this.timesOfDays) {

      const list = this.timesOfDays.nativeElement as HTMLDivElement;

      if (list) {

        for (const cell of Array.from(list.children) as HTMLDivElement[]) {
          this._renderer.setStyle(cell, 'width', `${list.offsetWidth}px`);
        }
      }
    }
  }
}
