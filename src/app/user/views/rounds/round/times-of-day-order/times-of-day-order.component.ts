import {CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray} from '@angular/cdk/drag-drop';
import {NgClass, NgTemplateOutlet} from '@angular/common';
import {Component, signal} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faGripLines} from '@fortawesome/free-solid-svg-icons';
import {catchError, NEVER} from 'rxjs';
import {ConnectionService} from 'services';
import {RouterDict} from '../../../../../app.constants';
import {HTTPError} from '../../models';
import {RoundsService} from '../../rounds.service';

@Component({
  selector: 'app-times-of-day-order',
  standalone: true,
  templateUrl: './times-of-day-order.component.html',
  imports: [
    NgClass,
    MatButtonModule,
    MatProgressBarModule,
    CdkDropList,
    MatProgressSpinnerModule,
    FontAwesomeModule,
    CdkDrag,
    NgTemplateOutlet,
  ],
  styleUrls: ['./times-of-day-order.component.scss']
})
export class TimesOfDayOrderComponent {

  selectedRound = this.roundsService.selectedRound;
  isOnline = this.connectionService.isOnline;
  isLoading = signal<boolean>(false);

  faGripLines = faGripLines;
  RouterDict = RouterDict;

  constructor(
    private roundsService: RoundsService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router,
    private connectionService: ConnectionService
  ) {
  }

  drop(event: CdkDragDrop<string[]>): void {

    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const order = this.selectedRound()!.timesOfDay;
    const timeOfDay = order[event.previousIndex];
    const moveBy = event.currentIndex - event.previousIndex;

    moveItemInArray(order, event.previousIndex, event.currentIndex);
    this.selectedRound.update((currRound) => {
      if (currRound) {
        return {
          ...currRound,
          timesOfDay: order,
        };
      }

      return undefined;
    });

    this.isLoading.set(true);
    this.roundsService.setTimesOfDayOrder({
      timeOfDay,
      moveBy,
      roundId: this.selectedRound()!.id
    }).pipe(catchError((error: HTTPError) => {
      this.isLoading.set(false);
      this.snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
      moveItemInArray(order, event.currentIndex, event.previousIndex);
      this.selectedRound.update((currRound) => {
        if (currRound) {
          return {
            ...currRound,
            timesOfDay: order,
          };
        }

        return undefined;
      });
      return NEVER;
    })).subscribe((success) => {
      this.isLoading.set(false);
      this.snackBar.open(success.details || 'Your operation has been done 😉');
    });
  }

  addNewTask(): void {
    this.router.navigate(['../', RouterDict.taskEditor], {relativeTo: this.route});
  }
}
