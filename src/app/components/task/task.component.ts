import {ENTER} from '@angular/cdk/keycodes';
import {AsyncPipe, NgClass, TitleCasePipe} from '@angular/common';
import {Component, DestroyRef, ElementRef, Inject, OnDestroy, ViewChild} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors
} from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
  MatAutocompleteTrigger
} from '@angular/material/autocomplete';
import {MatButtonModule} from '@angular/material/button';
import {MatChipInputEvent, MatChipsModule} from '@angular/material/chips';
import {MatDialog} from '@angular/material/dialog';
import {MatInputModule} from '@angular/material/input';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';
import 'global.prototype';
import {DocumentReference, Firestore} from 'firebase/firestore';
import {BehaviorSubject, catchError, combineLatest, NEVER, of, Subscription, switchMap} from 'rxjs';
import {fadeZoomInOutTrigger} from '../../animations/fade-zoom-in-out.trigger';
import {RouterDict} from '../../app.constants';
import {FirestoreInjectionToken} from '../../models/firebase';
import {Day} from '../../models/day';
import {HTTPError, HTTPSuccess} from '../../models/http';
import {Round, RoundDoc} from '../../models/round';
import {Task, TaskDoc} from '../../models/task';
import {User} from '../../models/user';
import {AuthService} from '../../services/auth.service';
import {ConnectionService} from '../../services/connection.service';
import {CustomValidators} from '../../services/custom-validators';
import {docSnapshots} from '../../services/firebase/firestore';
import {RoundsService} from '../../services/rounds.service';
import {TaskService} from '../../services/task.service';
import {TaskDialogConfirmDeleteComponent} from '../task-dialog-confirm-delete/task-dialog-confirm-delete.component';
import {ErrorDirective, InputDirective, LabelDirective} from '../ui/form-field/directives';
import {FormFieldComponent} from '../ui/form-field/form-field.component';

export interface TaskForm {
  description: string | null;
  daysOfTheWeek: { [key in Day]: boolean | null };
  timesOfDay: string[];
}

@Component({
  selector: 'app-task',
  standalone: true,
  templateUrl: './task.component.html',
  imports: [
    ReactiveFormsModule,
    NgClass,
    MatInputModule,
    MatSlideToggleModule,
    TitleCasePipe,
    MatChipsModule,
    MatAutocompleteModule,
    MatProgressBarModule,
    MatButtonModule,
    FormFieldComponent,
    LabelDirective,
    InputDirective,
    ErrorDirective,
    AsyncPipe
  ],
  styleUrls: ['./task.component.scss'],
  animations: [
    fadeZoomInOutTrigger
  ]
})
export class TaskComponent implements OnDestroy {

  protected readonly _taskId$ = new BehaviorSubject<string | null | undefined>(null);

  protected readonly _round$ = this._roundsService.round$;
  protected readonly _isOnline$ = this._connectionService.isOnline$;

  protected readonly _user$ = this._authService.user$;
  protected readonly _cryptoKey$ = this._authService.cryptoKey$;

  protected readonly _loading$ = new BehaviorSubject(false);

  protected readonly _task$ = new BehaviorSubject<Task | undefined>(undefined);

  private _initValues: TaskForm = {
    daysOfTheWeek: {
      mon: false,
      tue: false,
      wed: false,
      thu: false,
      fri: false,
      sat: false,
      sun: false
    },
    description: '',
    timesOfDay: []
  };

  protected readonly _isNothingChanged$ = new BehaviorSubject<boolean>(true);

  protected readonly _filteredOptions$ = new BehaviorSubject<string[]>([]);

  private readonly _allOptions$ = new BehaviorSubject<string[]>([]);

  protected readonly _taskForm = new FormGroup({
    description: new FormControl('', CustomValidators.maxRequired(256)),
    daysOfTheWeek: new FormGroup({
      mon: new FormControl(false),
      tue: new FormControl(false),
      wed: new FormControl(false),
      thu: new FormControl(false),
      fri: new FormControl(false),
      sat: new FormControl(false),
      sun: new FormControl(false)
    }, TaskComponent.daysOfTheWeekValidator),
    timesOfDay: new FormArray([] as AbstractControl[], TaskComponent.timesOfDayValidator),
    timeOfDayId: new FormControl('')
  });

  protected readonly _timeOfDayId = this._taskForm.controls.timeOfDayId;
  protected readonly _timesOfDay = this._taskForm.controls.timesOfDay;
  protected readonly _daysOfTheWeek = this._taskForm.controls.daysOfTheWeek;
  protected readonly _description = this._taskForm.controls.description;

  protected readonly _separatorKeysCodes: number[] = [ENTER];

  @ViewChild(MatAutocompleteTrigger, {read: MatAutocompleteTrigger}) input!: MatAutocompleteTrigger;
  @ViewChild('basicInput') basicInput!: ElementRef<HTMLInputElement>;

  private _taskSub: Subscription | undefined;

  constructor(
    public readonly dialog: MatDialog,
    private readonly _snackBar: MatSnackBar,
    private readonly _taskService: TaskService,
    private readonly _roundsService: RoundsService,
    private readonly _router: Router,
    private readonly _route: ActivatedRoute,
    private readonly _connectionService: ConnectionService,
    private readonly _authService: AuthService,
    @Inject(FirestoreInjectionToken) private readonly _firestore: Firestore,
    private readonly _destroyRef: DestroyRef
  ) {

    this._taskForm.disable();

    this._route.paramMap.subscribe((paramMap) => {
      this._taskId$.next(paramMap.get('id') || undefined);
    });

    this._taskForm.valueChanges.subscribe(() => {

      const description = this._description.value || '';
      const timesOfDay = this._timesOfDay.value;
      const daysOfTheWeek = this._daysOfTheWeek.value;

      const isValueInit = (this._initValues.description || '').trim() === description.trim() &&
        this._initValues.timesOfDay.toSet().hasOnly(timesOfDay.toSet()) &&
        this._initValues.daysOfTheWeek.mon === daysOfTheWeek.mon &&
        this._initValues.daysOfTheWeek.tue === daysOfTheWeek.tue &&
        this._initValues.daysOfTheWeek.wed === daysOfTheWeek.wed &&
        this._initValues.daysOfTheWeek.thu === daysOfTheWeek.thu &&
        this._initValues.daysOfTheWeek.fri === daysOfTheWeek.fri &&
        this._initValues.daysOfTheWeek.sat === daysOfTheWeek.sat &&
        this._initValues.daysOfTheWeek.sun === daysOfTheWeek.sun;
      this._isNothingChanged$.next(!isValueInit);
    });

    combineLatest([
      this._round$
    ]).pipe(
      takeUntilDestroyed(this._destroyRef)
    ).subscribe(([round]) => {

      if (!round) {
        return;
      }

      const timesOfDays = (new Set(round.timesOfDay).difference(new Set(this._timesOfDay.value))).toArray();
      this._allOptions$.next(timesOfDays);
      this.applyFilter(this._timeOfDayId.value || '');
    });

    combineLatest([
      this._timesOfDay.valueChanges,
      this._round$
    ]).pipe(
      takeUntilDestroyed(this._destroyRef)
    ).subscribe(([timesOfDay, round]) => {

      if (!round) {
        return;
      }

      const timesOfDays = (new Set(round.timesOfDay).difference(new Set(timesOfDay))).toArray();
      this._allOptions$.next(timesOfDays);
      this.applyFilter(this._timeOfDayId.value || '');
    });

    this._timeOfDayId.valueChanges.subscribe((timeOfDayId) => {
      this.applyFilter(timeOfDayId || '');
    });

    // task
    let task_roundId: string | undefined;
    let task_taskId: string | undefined;
    let task_userId: string | undefined;

    combineLatest([
      this._user$,
      this._round$,
      this._taskId$,
      this._cryptoKey$,
    ]).pipe(
      takeUntilDestroyed(this._destroyRef)
    ).subscribe(([user, round, taskId, cryptoKey]) => {

      if (!user || !round || !taskId || !cryptoKey) {
        task_userId = undefined;
        task_roundId = undefined;
        task_taskId = undefined;
        this._taskSub && !this._taskSub.closed && this._taskSub.unsubscribe();
        this._task$.next(undefined);
        this._taskForm.enable();
        return;
      }

      if (
        task_userId === user.id &&
        task_roundId === round.id &&
        task_taskId === taskId
      ) {
        return;
      }

      task_userId = user.id;
      task_roundId = round.id;
      task_taskId = taskId;

      const userRef = User.ref(this._firestore, user.id);
      const roundRef = Round.ref(userRef, round.id) as DocumentReference<Round, RoundDoc>;
      const taskRef = Task.ref(roundRef, taskId) as DocumentReference<Task, TaskDoc>;

      this._loading$.next(true);
      this._taskSub && !this._taskSub.closed && this._taskSub.unsubscribe();
      this._taskSub = docSnapshots(taskRef).pipe(
        switchMap((docSnap) => Task.data(docSnap, cryptoKey)),
        catchError(() => of(null)),
        takeUntilDestroyed(this._destroyRef)
      ).subscribe((task) => {

        this._loading$.next(false);

        if (task) {
          this._task$.next(task);
          this.setAll(task);
        }

        this._taskForm.enable();
      });
    });
  }

  handleAddTimeOfDayId(event: MatChipInputEvent): void {

    const value = (event.value || '').trim();

    if (!value) {
      return;
    }

    if ((this._timesOfDay.value as string[]).includes(value)) {
      this._snackBar.open('Enter new one');
    } else if (value.length > 256) {
      this._snackBar.open('Enter time of day length from 1 to 256');
      this.basicInput.nativeElement.value = '';
    } else if (((this._timesOfDay as FormArray).value as string[]).length >= 10) {
      this._snackBar.open('Up to 10 times of day per task');
    } else {
      this._timesOfDay.push(new FormControl<string>(value));
      event.chipInput!.clear();
      this._timeOfDayId.setValue(null);
    }
  }

  handleOptionSelected(event: MatAutocompleteSelectedEvent): void {
    this._timesOfDay.push(new FormControl<string>(event.option.viewValue));
    this._timeOfDayId.setValue(null);
  }

  handleRemoveTimeOfDay(index: number): void {
    this._timesOfDay.markAsDirty();
    this._timesOfDay.removeAt(index);
  }

  applyFilter(value: string): void {
    if (value) {
      const filterValue = value.toLowerCase();
      this._filteredOptions$.next(this._allOptions$.value?.filter((option) => option.toLowerCase().includes(filterValue)));
    } else {
      this._filteredOptions$.next(this._allOptions$.value);
    }
  }

  saveTask(): void {

    this._loading$.next(true);
    this._taskForm.disable();

    const task = this._taskForm.getRawValue();
    const trimDescription = (task.description || '').trim();
    task.description = trimDescription;
    this._description.setValue(trimDescription);

    this._roundsService.saveTask({
      task: {
        description: task.description,
        daysOfTheWeek: this._taskService.daysBooleanMapToDayArray(task.daysOfTheWeek),
        timesOfDay: task.timesOfDay
      },
      taskId: this._task$.value?.id || 'null',
      roundId: this._round$.value!.id
    }).pipe(catchError((error: HTTPError) => {
      this._loading$.next(false);
      this._taskForm.enable();
      this._snackBar.open(error.message || 'Some went wrong 🤫 Try again 🙂');
      return NEVER;
    })).subscribe((success) => {

      this._snackBar.open(success.details || 'Your operation has been done 😉');

      if (success.created) {
        this._router.navigate(['/', RouterDict.user, RouterDict.rounds, this._round$.value!.id, RouterDict.taskEditor, success.taskId], {relativeTo: this._route});
      }
    });
  }

  resetForm(): void {

    this._taskForm.reset({
      description: '',
      daysOfTheWeek: {
        mon: false,
        tue: false,
        wed: false,
        thu: false,
        fri: false,
        sat: false,
        sun: false
      }
    });

    this._timesOfDay.clear();

    this._initValues = {
      daysOfTheWeek: {
        mon: false,
        tue: false,
        wed: false,
        thu: false,
        fri: false,
        sat: false,
        sun: false
      },
      description: '',
      timesOfDay: []
    };
  }

  deleteTask(): void {

    const dialogRef = this.dialog.open(TaskDialogConfirmDeleteComponent);

    dialogRef.afterClosed().subscribe((isConfirmed) => {

      if (isConfirmed) {
        this._taskForm.disable();
        this._loading$.next(true);

        this._roundsService.deleteTask({
          taskId: this._task$.value!.id,
          roundId: this._round$.value!.id
        }).pipe(catchError((error: HTTPError) => {
          this._loading$.next(false);
          this._taskForm.enable();
          this._snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
          return NEVER;
        })).subscribe((success: HTTPSuccess) => {
          this._snackBar.open(success.details || 'Your operation has been done 😉');
          this._taskId$.next(undefined);
        });
      }
    });
  }

  setAll(task: Task): void {

    this.resetForm();
    this._taskForm.disable();

    this._description.setValue(task.description);
    this._daysOfTheWeek.setValue(this._taskService.dayArrayToDaysBooleanMap(task.daysOfTheWeek));

    task.timesOfDay.forEach((timeOfDayId) => {
      this._timesOfDay.push(new FormControl(timeOfDayId.trim()));
    });

    this._initValues = this._taskForm.getRawValue();
    this._taskForm.enable();
  }

  static daysOfTheWeekValidator(g: AbstractControl<any, any>): ValidationErrors | null {
    const rawValue = g.getRawValue();
    const some = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].some((checkbox) => rawValue[checkbox]);
    return some ? null : {required: true};
  }

  static timesOfDayValidator(g: AbstractControl<any, any>): ValidationErrors | null {
    return g.value.length > 0 && g.value.length <= 10 ? null : {required: true};
  }

  ngOnDestroy(): void {
    this._taskId$.next(undefined);
    this._task$.next(undefined);
  }
}
