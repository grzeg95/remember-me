import {Dialog} from '@angular/cdk/dialog';
import {NgClass, NgStyle, TitleCasePipe} from '@angular/common';
import {
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
  ViewEncapsulation
} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import 'global.prototype';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {catchError, map, NEVER, of, Subscription, takeWhile} from 'rxjs';
import {Day} from '../../models/firestore/Day';
import {getRoundRef} from '../../models/firestore/Round';
import {getTaskRef, Task as FirestoreTask} from '../../models/firestore/Task';
import {getFirestoreUserRef} from '../../models/firestore/User';
import {HTTPError} from '../../models/http';
import {RouterDict} from '../../models/router-dict';
import {Auth} from '../../services/auth';
import {Connection} from '../../services/connection';
import {Rounds} from '../../services/rounds';
import {FirestoreInjectionToken} from '../../tokens/firebase';
import {Autocomplete, AutocompleteSelectedEvent} from '../../ui/autocomplete/autocomplete';
import {AutocompleteTrigger} from '../../ui/autocomplete/autocomplete-trigger';
import {Button} from '../../ui/button/button';
import {Chip} from '../../ui/chips/chip/chip';
import {ChipsSet} from '../../ui/chips/chips-set/chips-set';
import {ChipEndEvent, ChipInputFor} from '../../ui/chips/directives/chip-input-for';
import {ChipRemove} from '../../ui/chips/directives/chip-remove';
import {Error} from '../../ui/form/error/error';
import {FormField} from '../../ui/form/form-field/form-field';
import {Input} from '../../ui/form/input';
import {Label} from '../../ui/form/label/label';
import {Option} from '../../ui/option/option';
import {ProgressBarIndeterminate} from '../../ui/progress-bar-indeterminate/progress-bar-indeterminate';
import {SlideToggle} from '../../ui/slide-toggle/slide-toggle';
import {SnackBar} from '../../ui/snack-bar/snack-bar';
import {dayArrayToDaysBooleanMap} from '../../utils/day-array-to-days-booleand-map';
import {daysBooleanMapToDayArray} from '../../utils/days-boolean-map-to-day-array';
import {docSnapshots} from '../../utils/firestore';
import {TaskDialogConfirmDelete} from '../dialog/task-dialog-confirm-delete/task-dialog-confirm-delete';

export interface TaskForm {
  description: string | null;
  days: { [key in Day]: boolean | null };
  timesOfDay: string[];
}

@Component({
  selector: 'app-task',
  standalone: true,
  templateUrl: './task.html',
  imports: [
    ReactiveFormsModule,
    NgClass,
    TitleCasePipe,
    Chip,
    ChipsSet,
    Label,
    FormField,
    Option,
    Autocomplete,
    ProgressBarIndeterminate,
    Error,
    Input,
    AutocompleteTrigger,
    ChipInputFor,
    ChipRemove,
    Button,
    SlideToggle,
    RouterLink,
    NgStyle
  ],
  styleUrl: './task.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'app-task'
  }
})
export class Task implements OnInit {

  public readonly dialog = inject(Dialog);
  private readonly _snackBar = inject(SnackBar);
  private readonly _rounds = inject(Rounds);
  private readonly _router = inject(Router);
  private readonly _route = inject(ActivatedRoute);
  private readonly _connection = inject(Connection);
  private readonly _auth = inject(Auth);
  private readonly _firestore = inject(FirestoreInjectionToken);
  private readonly _destroyRef = inject(DestroyRef);

  protected readonly _timeOfDayInput = viewChild<ElementRef<HTMLInputElement>>('timeOfDayInput');
  protected readonly _taskId = signal<string | undefined>(undefined);
  protected readonly _selectedRound = toSignal(this._rounds.selectedRound$);
  protected readonly _dayToSetInEditor = toSignal(this._rounds.dayToSetInEditor$);
  protected readonly _isOnline = toSignal(this._connection.isOnline$);
  protected readonly _user = toSignal(this._auth.firestoreUser$);
  protected readonly _loading = signal(false);
  protected readonly _task = signal<FirestoreTask | undefined>(undefined);
  protected readonly _isNothingChanged = signal(true);
  protected readonly _filteredOptions = signal<string[]>([]);
  protected readonly _allOptions = signal<string[]>([]);

  private _initValues: TaskForm = {
    days: {
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

  protected readonly _taskForm = new FormGroup({
    description: new FormControl('', [Validators.required, Validators.maxLength(256)]),
    days: new FormGroup({
      mon: new FormControl(false),
      tue: new FormControl(false),
      wed: new FormControl(false),
      thu: new FormControl(false),
      fri: new FormControl(false),
      sat: new FormControl(false),
      sun: new FormControl(false)
    }, Task.daysValidator),
    timesOfDay: new FormArray([] as AbstractControl[], Task.timesOfDayValidator),
  });

  protected readonly _timesOfDay = this._taskForm.controls.timesOfDay;
  protected readonly _days = this._taskForm.controls.days;
  protected readonly _description = this._taskForm.controls.description;

  private _taskSub: Subscription | undefined;

  constructor() {

    effect(() => {

      const selectedRound = this._selectedRound();

      if (!selectedRound) {
        return;
      }

      const timesOfDays = (new Set(selectedRound.timesOfDay).difference(new Set(this._timesOfDay.value))).toArray();
      this._allOptions.set(timesOfDays);
      this.applyFilter(this._timeOfDayInput()?.nativeElement.value || '');
    });

    // task
    let task_selectedRoundId: string | undefined;
    let task_taskId: string | undefined;
    let task_userUid: string | undefined;
    effect(() => {

      const user = this._user();
      const selectedRound = this._selectedRound();
      const taskId = this._taskId();

      if (!user || !selectedRound || !taskId) {
        task_userUid = undefined;
        task_selectedRoundId = undefined;
        task_taskId = undefined;
        this._taskSub && !this._taskSub.closed && this._taskSub.unsubscribe();
        this._task.set(undefined);
        this._taskForm.enable();
        return;
      }

      if (
        task_userUid === user.uid &&
        task_selectedRoundId === selectedRound.id &&
        task_taskId === taskId
      ) {
        return;
      }

      task_userUid = user.uid;
      task_selectedRoundId = selectedRound.id;
      task_taskId = taskId;

      const userRef = getFirestoreUserRef(this._firestore, user.uid);
      const roundRef = getRoundRef(userRef, selectedRound.id);
      const taskRef = getTaskRef(roundRef, taskId);

      this._loading.set(true);
      this._taskSub && !this._taskSub.closed && this._taskSub.unsubscribe();
      this._taskSub = docSnapshots(taskRef).pipe(
        takeUntilDestroyed(this._destroyRef),
        takeWhile(() => !!this._user() || !!this._selectedRound() || !this._taskId()),
        map((docSnap) => docSnap.data()),
        catchError(() => of(null))
      ).subscribe((task) => {

        this._loading.set(false);

        if (task) {
          this._task.set(task);
          this.setAll(task);
        }

        this._taskForm.enable();
      });

    });

    effect(() => {
      const dayToSetInEditor = this._dayToSetInEditor();

      if (!dayToSetInEditor) {
        return;
      }

      this._taskForm.controls.days.controls[dayToSetInEditor]?.setValue(true);
    });
  }

  ngOnInit(): void {

    this._taskForm.disable();

    this._route.paramMap.subscribe((paramMap) => {
      this._taskId.set(paramMap.get('id') || undefined);
    });

    this._taskForm.valueChanges.subscribe(() => {

      const description = this._description.value || '';
      const timesOfDay = this._timesOfDay.value;
      const days = this._days.value;

      const isValueInit = (this._initValues.description || '').trim() === description.trim() &&
        this._initValues.timesOfDay.toSet().hasOnly(timesOfDay.toSet()) &&
        this._initValues.days.mon === days.mon &&
        this._initValues.days.tue === days.tue &&
        this._initValues.days.wed === days.wed &&
        this._initValues.days.thu === days.thu &&
        this._initValues.days.fri === days.fri &&
        this._initValues.days.sat === days.sat &&
        this._initValues.days.sun === days.sun;
      this._isNothingChanged.set(!isValueInit);
    });

    this._timesOfDay.valueChanges.subscribe((timesOfDay: string[]) => {

      const selectedRound = this._selectedRound();

      if (!selectedRound) {
        return;
      }

      const timesOfDays = (new Set(selectedRound.timesOfDay).difference(new Set(timesOfDay))).toArray();
      this._allOptions.set(timesOfDays);
      this.applyFilter(this._timeOfDayInput()?.nativeElement.value || '');
    });
  }

  protected _onTimeOfDayInputChange(value: string) {
    this.applyFilter(value || '');
  }

  handleAddTimeOfDayId(event: ChipEndEvent): void {

    const value = (event.value || '').trim();

    if (!value) {
      return;
    }

    if ((this._timesOfDay.value as string[]).includes(value)) {
      this._snackBar.open('Enter new one');
    } else if (value.length > 256) {
      this._snackBar.open('Enter time of day length from 1 to 256');
    } else if (((this._timesOfDay as FormArray).value as string[]).length >= 10) {
      this._snackBar.open('Up to 10 times of day per task');
    } else {
      this._timesOfDay.push(new FormControl<string>(value));
      event.chipInput!.clear();
    }
  }

  handleOptionSelected(event: AutocompleteSelectedEvent): void {
    this._timesOfDay.push(new FormControl<string>(event.option.value() + ''));
    this._timeOfDayInput()!.nativeElement.value = '';
  }

  handleRemoveTimeOfDay(index: number): void {
    this._timesOfDay.markAsDirty();
    this._timesOfDay.removeAt(index);
  }

  applyFilter(value: string): void {
    if (value) {
      const filterValue = value.toLowerCase();
      this._filteredOptions.set(this._allOptions()?.filter((option) => option.toLowerCase().includes(filterValue)));
    } else {
      this._filteredOptions.set(this._allOptions());
    }
  }

  createTask() {

    this._loading.set(true);
    this._taskForm.disable();

    const task = this._taskForm.getRawValue();
    const trimDescription = (task.description || '').trim();
    task.description = trimDescription;
    this._description.setValue(trimDescription);

    this._rounds.createTask({
      round: {
        id: this._selectedRound()!.id
      },
      task: {
        description: task.description,
        days: daysBooleanMapToDayArray(task.days),
        timesOfDay: task.timesOfDay
      }
    }).pipe(catchError((error: HTTPError) => {
      this._loading.set(false);
      this._taskForm.enable();
      this._snackBar.open(error.message || 'Some went wrong 🤫 Try again 🙂');
      return NEVER;
    })).subscribe((success) => {
      this._snackBar.open(success.data.details || 'Your operation has been done 😉');
      this._router.navigate(['/', RouterDict.rounds, this._selectedRound()!.id, RouterDict.taskEditor, success.data.taskId]);
    });
  }

  updateTask() {

    this._loading.set(true);
    this._taskForm.disable();

    const task = this._taskForm.getRawValue();
    const trimDescription = (task.description || '').trim();
    task.description = trimDescription;
    this._description.setValue(trimDescription);

    this._rounds.updateTask({
      round: {
        id: this._selectedRound()!.id
      },
      task: {
        id: this._task()?.id!,
        description: task.description,
        days: daysBooleanMapToDayArray(task.days),
        timesOfDay: task.timesOfDay
      }
    }).pipe(catchError((error: HTTPError) => {
      this._snackBar.open(error.message || 'Some went wrong 🤫 Try again 🙂');
      return NEVER;
    })).subscribe((success) => {
      this._snackBar.open(success.data.details || 'Your operation has been done 😉');
    });
  }

  saveTask(): void {

    if (this._taskForm.disabled || this._taskForm.invalid || !this._isOnline() || !this._isNothingChanged()) {
      return;
    }

    if (this._task()?.id) {
      this.updateTask();
    } else {
      this.createTask();
    }
  }

  resetForm(): void {

    this._taskForm.reset({
      description: '',
      days: {
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
      days: {
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

    const dialogRef = this.dialog.open(TaskDialogConfirmDelete);

    dialogRef.closed.subscribe((isConfirmed) => {

      if (isConfirmed) {
        this._taskForm.disable();
        this._loading.set(true);

        this._rounds.deleteTask({
          round: {
            id: this._selectedRound()!.id
          },
          task: {
            id: this._task()!.id
          }
        }).pipe(catchError((error: HTTPError) => {
          this._loading.set(false);
          this._taskForm.enable();
          this._snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
          return NEVER;
        })).subscribe((success) => {
          this._snackBar.open(success.data.details || 'Your operation has been done 😉');
          this._taskId.set(undefined);
        });
      }
    });
  }

  setAll(task: FirestoreTask): void {

    this.resetForm();
    this._taskForm.disable();

    this._description.setValue(task.description);
    this._days.setValue(dayArrayToDaysBooleanMap(task.days));

    task.timesOfDay.forEach((timeOfDayId) => {
      this._timesOfDay.push(new FormControl(timeOfDayId.trim()));
    });

    this._initValues = this._taskForm.getRawValue();
    this._taskForm.enable();
  }

  static daysValidator(g: AbstractControl<any, any>): ValidationErrors | null {
    const rawValue = g.getRawValue();
    const some = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].some((checkbox) => rawValue[checkbox]);
    return some ? null : {required: true};
  }

  static timesOfDayValidator(g: AbstractControl<any, any>): ValidationErrors | null {
    return g.value.length > 0 && g.value.length <= 10 ? null : {required: true};
  }
}
