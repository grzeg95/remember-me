import {ENTER} from '@angular/cdk/keycodes';
import {NgClass, TitleCasePipe} from '@angular/common';
import {Component, ElementRef, OnDestroy, OnInit, signal, ViewChild} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
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
import {AngularFirebaseFirestoreService} from 'angular-firebase';
import {AuthService, User} from 'auth';
import 'global.prototype';
import {catchError, EMPTY, mergeMap, NEVER, Subscription, throwError} from 'rxjs';
import {filter} from 'rxjs/operators';
import {ConnectionService, CustomValidators} from 'services';
import {BasicEncryptedValue} from 'utils';
import {RouterDict} from '../../../../../app.constants';
import {HTTPError, HTTPSuccess, Round, Task, TaskForm} from '../../models';
import {RoundsService} from '../../rounds.service';
import {decryptTask} from '../../utils/crypto';
import {TaskDialogConfirmDeleteComponent} from './task-dialog-confirm-delete/task-dialog-confirm-delete.component';
import {TaskService} from './task.service';

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
    MatButtonModule
  ],
  styleUrls: ['./task.component.scss']
})
export class TaskComponent implements OnInit, OnDestroy {

  isOnline = this.connectionService.isOnline;
  isLoading = signal<boolean>(true);
  editedTask = signal<Task | undefined>(undefined);
  initValues: TaskForm = {
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
  isNothingChanged = signal<boolean>(true);
  selectedRound = this.roundsService.selectedRound;
  selectedRound$ = toObservable(this.roundsService.selectedRound)
  filteredOptions = signal<string[]>([]);
  allOptions = signal<string[]>([]);

  taskForm = new FormGroup({
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
    timeOfDay: new FormControl('')
  });

  timeOfDay = this.taskForm.controls.timeOfDay;
  timesOfDay = this.taskForm.controls.timesOfDay;
  daysOfTheWeek = this.taskForm.controls.daysOfTheWeek;
  description = this.taskForm.controls.description;

  separatorKeysCodes: number[] = [ENTER];

  @ViewChild(MatAutocompleteTrigger, {read: MatAutocompleteTrigger}) input!: MatAutocompleteTrigger;
  @ViewChild('basicInput') basicInput!: ElementRef<HTMLInputElement>;

  editedTaskOnSnapSub: Subscription | undefined;

  constructor(
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    private taskService: TaskService,
    private roundsService: RoundsService,
    private router: Router,
    private route: ActivatedRoute,
    private connectionService: ConnectionService,
    private authService: AuthService,
    private angularFirebaseFirestoreService: AngularFirebaseFirestoreService
  ) {
    this.taskForm.disable();
  }

  ngOnInit(): void {

    this.route.paramMap.subscribe((paramMap) => {
      this.setGettingOfTaskById(paramMap.get('id') || '');
    });

    this.taskForm.valueChanges.subscribe(() => {

      const description = this.description.value || '';
      const timesOfDay = this.timesOfDay.value;
      const daysOfTheWeek = this.daysOfTheWeek.value;

      const isValueInit = (this.initValues.description || '').trim() === description.trim() &&
        this.initValues.timesOfDay.toSet().hasOnly(timesOfDay.toSet()) &&
        this.initValues.daysOfTheWeek.mon === daysOfTheWeek.mon &&
        this.initValues.daysOfTheWeek.tue === daysOfTheWeek.tue &&
        this.initValues.daysOfTheWeek.wed === daysOfTheWeek.wed &&
        this.initValues.daysOfTheWeek.thu === daysOfTheWeek.thu &&
        this.initValues.daysOfTheWeek.fri === daysOfTheWeek.fri &&
        this.initValues.daysOfTheWeek.sat === daysOfTheWeek.sat &&
        this.initValues.daysOfTheWeek.sun === daysOfTheWeek.sun;
      this.isNothingChanged.set(!isValueInit);
    });

    this.selectedRound$.pipe(
      filter((round): round is Round => !!round)
    ).subscribe((round) => {
      const timesOfDays = (new Set(round.timesOfDay).difference(new Set(this.timesOfDay.value))).toArray();
      this.allOptions.set(timesOfDays);
      this.applyFilter(this.timeOfDay.value || '');
    });

    this.timesOfDay.valueChanges.subscribe((timesOfDay: string[]) => {
      const timesOfDays = (new Set(this.roundsService.selectedRound()!.timesOfDay).difference(new Set(timesOfDay))).toArray();
      this.allOptions.set(timesOfDays);
      this.applyFilter(this.timeOfDay.value || '');
    });

    this.timeOfDay.valueChanges.subscribe((timeOfDay) => {
      this.applyFilter(timeOfDay || '');
    });
  }

  ngOnDestroy(): void {
    if (this.editedTaskOnSnapSub && !this.editedTaskOnSnapSub.closed) {
      this.editedTaskOnSnapSub.unsubscribe();
    }
  }

  handleAddTimeOfDay(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    if (!value) {
      return;
    }

    if ((this.timesOfDay.value as string[]).includes(value)) {
      this.snackBar.open('Enter new one');
    } else if (value.length > 256) {
      this.snackBar.open('Enter time of day length from 1 to 256');
      this.basicInput.nativeElement.value = '';
    } else if (((this.taskForm.get('timesOfDay') as FormArray).value as string[]).length >= 10) {
      this.snackBar.open('Up to 10 times of day per task');
    } else {
      this.timesOfDay.push(new FormControl<string>(value));
      event.chipInput!.clear();
      this.timeOfDay.setValue(null);
    }
  }

  handleOptionSelected(event: MatAutocompleteSelectedEvent): void {
    this.timesOfDay.push(new FormControl<string>(event.option.viewValue));
    this.timeOfDay.setValue(null);
  }

  handleRemoveTimeOfDay(index: number): void {
    this.timesOfDay.markAsDirty();
    this.timesOfDay.removeAt(index);
  }

  applyFilter(value: string): void {
    if (value) {
      const filterValue = value.toLowerCase();
      this.filteredOptions.set(this.allOptions().filter((option) => option.toLowerCase().includes(filterValue)));
    } else {
      this.filteredOptions.set(this.allOptions());
    }
  }

  setGettingOfTaskById(id: string) {

    if (this.editedTaskOnSnapSub && !this.editedTaskOnSnapSub.closed) {
      this.editedTaskOnSnapSub.unsubscribe();
    }

    if (!id) {
      this.resetForm();
      this.editedTask.set(undefined);
      this.router.navigate(['/', RouterDict.user, RouterDict.rounds, this.selectedRound()!.id, RouterDict.taskEditor]);
      this.taskForm.enable();
      this.isLoading.set(false);

      const dayToApply = this.roundsService.dayToApply();

      if (dayToApply) {
        this.daysOfTheWeek.get(dayToApply)?.setValue(true);
        this.roundsService.dayToApply.set(null);
      }

      return;
    }

    const user = this.authService.user$.value as User;

    this.editedTaskOnSnapSub = this.angularFirebaseFirestoreService.docOnSnapshot<BasicEncryptedValue>(`users/${user.firebaseUser.uid}/rounds/${this.selectedRound()!.id}/task/${id}`).pipe(
      mergeMap((docSnap) => {

        if (!docSnap.exists()) {
          throw throwError(() => {
          });
        }

        return decryptTask(docSnap.data(), user.cryptoKey).then((task) => {
          task.id = docSnap.id;
          return task;
        });
      }),
      catchError(() => {
        this.setGettingOfTaskById('');
        return EMPTY;
      }),
    ).subscribe((task) => {

      this.isLoading.set(false);
      this.editedTask.set(task);
      this.setAll(task);

      this.taskForm.enable();
    });
  }

  saveTask(): void {

    this.isLoading.set(true);
    this.taskForm.disable();

    const task = this.taskForm.getRawValue() as TaskForm;
    const trimDescription = (task.description || '').trim();
    task.description = trimDescription;
    this.description.setValue(trimDescription);

    this.roundsService.saveTask({
      task: {
        description: task.description,
        daysOfTheWeek: this.taskService.daysBooleanMapToDayArray(task.daysOfTheWeek),
        timesOfDay: task.timesOfDay
      },
      taskId: this.editedTask()?.id || 'null',
      roundId: this.roundsService.selectedRound()!.id
    }).pipe(catchError((error: HTTPError) => {
      this.isLoading.set(false);
      this.taskForm.enable();
      this.snackBar.open(error.message || 'Some went wrong 🤫 Try again 🙂');
      return NEVER;
    })).subscribe((success) => {

      this.snackBar.open(success.details || 'Your operation has been done 😉');

      if (success.created) {
        this.router.navigate(['/', RouterDict.user, RouterDict.rounds, this.selectedRound()!.id, RouterDict.taskEditor, success.taskId], {relativeTo: this.route});
      }
    });
  }

  resetForm(): void {
    this.taskForm.reset({
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

    this.timesOfDay.clear();

    this.initValues = {
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
        this.taskForm.disable();
        this.isLoading.set(true);

        this.roundsService.deleteTask({
          taskId: this.editedTask()!.id,
          roundId: this.selectedRound()!.id
        }).pipe(catchError((error: HTTPError) => {
          this.isLoading.set(false);
          this.taskForm.enable();
          this.snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
          return NEVER;
        })).subscribe((success: HTTPSuccess) => {
          this.snackBar.open(success.details || 'Your operation has been done 😉');
          this.setGettingOfTaskById('');
        });
      }
    });
  }

  setAll(task: Task): void {

    this.resetForm();
    this.taskForm.disable();

    this.description.setValue(task.description);
    this.daysOfTheWeek.setValue(this.taskService.dayArrayToDaysBooleanMap(task.daysOfTheWeek));

    task.timesOfDay.forEach((timeOfDay) => {
      this.timesOfDay.push(new FormControl(timeOfDay.trim()));
    });

    this.initValues = this.taskForm.getRawValue();
    this.taskForm.enable();
  }

  static daysOfTheWeekValidator(g: AbstractControl<any, any>): ValidationErrors | null {
    const rawValue = g.getRawValue();
    const some = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].some((checkbox) => rawValue[checkbox]);
    return some ? null : {required: true};
  }

  static timesOfDayValidator(g: AbstractControl<any, any>): ValidationErrors | null {
    return g.value.length > 0 && g.value.length <= 10 ? null : {required: true};
  }
}
