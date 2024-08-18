import {NgTemplateOutlet} from '@angular/common';
import {Component, OnDestroy, OnInit} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faCheckCircle} from '@fortawesome/free-solid-svg-icons';
import {FieldPath} from 'firebase/firestore';
import {catchError, interval, NEVER, Subscription} from 'rxjs';
import { RouterDict } from '../../app.constants';
import {TodayItem} from '../../models/models';
import {User} from '../../models/user-data.model';
import {ConnectionService} from '../../services';
import {AngularFirebaseFirestoreService} from '../../services/angular-firebase-firestore.service';
import {AuthService} from '../../services/auth.service';
import {RoundsService} from '../../services/rounds.service';

@Component({
  selector: 'app-today',
  standalone: true,
  templateUrl: './today.component.html',
  imports: [
    MatButtonModule,
    FontAwesomeModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    NgTemplateOutlet
  ],
  styleUrl: './today.component.scss'
})
export class TodayComponent implements OnInit, OnDestroy {

  todayName = this.roundsService.todayName;
  isOnline = this.connectionService.isOnline;
  todayItems = this.roundsService.todayItems;
  todayItemsFirstLoading = this.roundsService.todayItemsFirstLoading;
  selectedRound = this.roundsService.selectedRound;

  RouterDict = RouterDict;
  faCheckCircle = faCheckCircle;

  changeDayIntervalSub: Subscription | undefined;

  constructor(
    private authService: AuthService,
    private roundsService: RoundsService,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
    private connectionService: ConnectionService,
    private angularFirebaseFirestoreService: AngularFirebaseFirestoreService
  ) {
  }

  ngOnInit(): void {
    this.changeDay();
  }

  ngOnDestroy(): void {
    if (this.changeDayIntervalSub && !this.changeDayIntervalSub.closed) {
      this.changeDayIntervalSub.unsubscribe();
    }
  }

  todayItemIsDone(timeOfDay: string): boolean {
    return !this.roundsService.todayItems().find((totayItem) => totayItem.timeOfDay === timeOfDay)?.tasks.some((task) => !task.done);
  }

  changeDay(): void {

    const round = this.selectedRound();

    const now = new Date();
    const todayPast = now.getSeconds() + (now.getMinutes() * 60) + (now.getHours() * 60 * 60);
    const toNextDay = (86400 - todayPast) * 1000;

    if (this.changeDayIntervalSub && !this.changeDayIntervalSub.closed) {
      this.changeDayIntervalSub.unsubscribe();
    }

    this.changeDayIntervalSub = interval(toNextDay).subscribe(() => this.changeDay());
    this.roundsService.setGettingOfTodayTasks(round!);
  }

  setProgress(todayItem: TodayItem, event: Event): void {

    event.preventDefault();

    if (todayItem.disabled) {
      return;
    }

    todayItem.disabled = true;

    const user = this.authService.user$.value as User;

    this.angularFirebaseFirestoreService.updateDoc(
      `/users/${user.firebaseUser.uid}/rounds/${this.roundsService.selectedRound()?.id}/today/${todayItem.dayOfTheWeekId}/task/${todayItem.id}`,
      new FieldPath('timesOfDay', todayItem.timeOfDayEncrypted),
      !todayItem.done
    ).pipe(catchError(() => {
      todayItem.disabled = false;
      this.snackBar.open('Some went wrong 🤫 Try again 🙂');
      this.changeDay();
      return NEVER;
    })).subscribe(() => {
      todayItem.disabled = false;
    });

    if (!this.isOnline()) {
      todayItem.disabled = false;
      todayItem.done = !todayItem.done;
    }
  }

  addNewTask(): void {
    this.roundsService.dayToSetInEditor.set(this.roundsService.todayName()!.short);
    this.router.navigate(['../', RouterDict.taskEditor], {relativeTo: this.route});
  }
}
