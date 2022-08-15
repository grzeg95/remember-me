import {ENTER} from '@angular/cdk/keycodes';
import {Location} from '@angular/common';
import {Component, ElementRef, Inject, NgZone, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {AbstractControl, FormArray, FormControl, FormGroup} from '@angular/forms';
import {MatAutocompleteSelectedEvent, MatAutocompleteTrigger} from '@angular/material/autocomplete';
import {MatChipInputEvent} from '@angular/material/chips';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router, UrlTree} from '@angular/router';
import {asapScheduler, BehaviorSubject, mergeMap, of, Subscription} from 'rxjs';
import '../../../../../../../../global.prototype';
import {startWith} from 'rxjs/operators';
import {RouterDict} from '../../../../../../app.constants';
import {ConnectionService} from "../../../../../../connection.service";
import {CustomValidators} from '../../../../../../custom-validators';
import {HTTPError, HTTPSuccess, Round, TaskForm, Task} from '../../../../../models';
import {TaskDialogConfirmDeleteComponent} from './task-dialog-confirm-delete/task-dialog-confirm-delete.component';
import {TaskService} from './task.service';
import {RoundService} from '../../round.service';
import {RoundsService} from '../../../rounds.service';
import {httpsCallable, Functions} from 'firebase/functions';

@Component({
  selector: 'app-task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.scss']
})
export class TaskComponent implements OnInit, OnDestroy {

  private waitingForRefresh: boolean;
  private waitingForRefreshTaskId: string;

  isOnline: boolean;
  isOnlineSub: Subscription;

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
  id = 'null';
  taskForm: FormGroup = new FormGroup({
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

  timesOfDay = this.taskForm.get('timesOfDay') as FormArray;
  daysOfTheWeek = this.taskForm.get('daysOfTheWeek') as FormGroup;
  description = this.taskForm.get('description');

  savingInProgress = false;
  deletingInProgress = false;
  filteredOptions$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
  separatorKeysCodes: number[] = [ENTER];
  options: string[] = [];
  @ViewChild(MatAutocompleteTrigger, {read: MatAutocompleteTrigger}) input: MatAutocompleteTrigger;
  @ViewChild('basicInput') basicInput: ElementRef<HTMLInputElement>;
  lastTwoInputs = [];
  round: Round;
  roundSelectedSub: Subscription;
  isConnectedSub: Subscription;
  roundsOrderSub: Subscription;
  timeOfDayValueChanges: Subscription;
  asapSchedulerForDayToApplySub: Subscription;

  constructor(
    private activeRoute: ActivatedRoute,
    private location: Location,
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    private roundService: RoundService,
    private zone: NgZone,
    private taskService: TaskService,
    private roundsService: RoundsService,
    private router: Router,
    private route: ActivatedRoute,
    private connectionService: ConnectionService,
    @Inject('FUNCTIONS') private readonly functions: Functions
  ) {
  }

  ngOnInit(): void {

    this.taskForm.enable();
    this.isOnlineSub = this.connectionService.isOnline$.subscribe((isOnline) => {
      if (isOnline) {
        this.refreshTaskByParamId(this.activeRoute.snapshot.params.id || 'null');
      } else {
        this.taskForm.disable();
      }
      this.isOnline = isOnline;
    });

    this.timeOfDayValueChanges = (this.taskForm.get('timesOfDay') as FormArray).valueChanges.subscribe((timesOfDay: string[]) => {

      if (!this.roundsService.roundSelected$.value) {
        this.options = timesOfDay;
        this.applyFilter(this.taskForm.get('timeOfDay').value);
        return;
      }

      const roundsOrderNext = this.roundsService.roundSelected$.value?.timesOfDay;
      const roundsOrderSet = roundsOrderNext.map((val) => val).toSet().difference(timesOfDay.toSet());
      const roundsOrder = [];

      for (const x of roundsOrderNext) {
        if (roundsOrderSet.has(x)) {
          roundsOrder.push(x);
          roundsOrderSet.delete(x);
        }
      }

      this.options = roundsOrder;
      this.applyFilter(this.taskForm.get('timeOfDay').value);
    });

    this.taskForm.get('timeOfDay').valueChanges.pipe(startWith('')).subscribe((value) => {

      this.lastTwoInputs.push(value);
      if (this.lastTwoInputs.length === 3) {
        this.lastTwoInputs = [this.lastTwoInputs[1], this.lastTwoInputs[2]];
      }

      this.applyFilter(value);
    });

    this.roundSelectedSub = this.roundsService.roundSelected$.subscribe((round) => {
      this.round = round;
      if (!round) {
        this.taskForm.disable();
      } else {

        if (this.waitingForRefresh) {
          this.refreshTaskByParamId(this.waitingForRefreshTaskId);
        } else {
          this.taskForm.enable();
        }

        const timesOfDayOrderSet = round.timesOfDay.map((val) => val).toSet().difference(this.taskForm.get('timesOfDay').value.toSet());
        const timesOfDayOrder = [];

        for (const x of round.timesOfDay) {
          if (timesOfDayOrderSet.has(x)) {
            timesOfDayOrder.push(x);
            timesOfDayOrderSet.delete(x);
          }
        }

        this.options = timesOfDayOrder;
        this.applyFilter(this.taskForm.get('timeOfDay').value);

      }
    });
  }

  add(event: MatChipInputEvent): void {

    const input = event.input;
    const timeOfDayValue = event.value;

    if (!timeOfDayValue) {
      this.taskForm.get('timesOfDay').clearValidators();
      return;
    }

    this.taskForm.get('timesOfDay').markAsDirty();
    const timeOfDay = timeOfDayValue.trim();

    if ((this.taskForm.get('timesOfDay').value as string[]).includes(timeOfDay)) {
      this.snackBar.open('Enter new one');
    } else if (timeOfDay.length > 256 || timeOfDay.length === 0) {
      this.snackBar.open('Enter time of day length from 1 to 256');
      this.basicInput.nativeElement.value = '';
    } else if (((this.taskForm.get('timesOfDay') as FormArray).value as string[]).length >= 10) {
      this.snackBar.open('Up to 10 times of day per task');
    } else {
      (this.taskForm.get('timesOfDay') as FormArray).push(new FormControl(timeOfDay));

      // Reset the input value
      if (input) {
        input.value = '';
      }
      this.taskForm.get('timeOfDay').setValue('');
      this.applyFilter('');

      this.input.openPanel();
    }
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    const timeOfDayValue = event.option.viewValue;

    if (!timeOfDayValue) {
      this.taskForm.get('timesOfDay').clearValidators();
      return;
    }

    this.taskForm.get('timesOfDay').markAsDirty();
    const timeOfDay = timeOfDayValue.trim();

    if ((this.taskForm.get('timesOfDay').value as string[]).includes(timeOfDay)) {
      this.snackBar.open('Enter new one');
    } else if (timeOfDay.length > 100 || timeOfDay.length === 0) {
      this.snackBar.open('Enter time of day length from 1 to 100');
    } else if (((this.taskForm.get('timesOfDay') as FormArray).value as string[]).length >= 10) {
      this.snackBar.open('Up to 10 times of day per task');
    } else {
      const inputToApply = this.lastTwoInputs[0];
      (this.taskForm.get('timesOfDay') as FormArray).push(new FormControl(timeOfDay));
      this.taskForm.get('timeOfDay').setValue(inputToApply);
      this.applyFilter(inputToApply);
    }
  }

  applyFilter(value: string): void {
    if (value) {
      const filterValue = value.toLowerCase();
      this.filteredOptions$.next(this.options.filter((option) => option.toLowerCase().includes(filterValue)));
    } else {
      this.filteredOptions$.next(this.options);
    }
  }

  ngOnDestroy(): void {
    this.isOnlineSub.unsubscribe();

    if (this.roundsOrderSub && !this.roundsOrderSub.closed) {
      this.roundsOrderSub.unsubscribe();
    }

    if (this.timeOfDayValueChanges && !this.timeOfDayValueChanges.closed) {
      this.timeOfDayValueChanges.unsubscribe();
    }

    this.roundSelectedSub.unsubscribe();

    if (this.asapSchedulerForDayToApplySub && !this.asapSchedulerForDayToApplySub.closed) {
      this.asapSchedulerForDayToApplySub.unsubscribe();
    }
  }

  resetId(): void {
    this.id = 'null';
  }

  idIsNull(): boolean {
    return this.id === 'null';
  }

  refreshTaskByParamId(taskId: string): void {

    if (!this.round) {
      this.waitingForRefresh = true;
      this.waitingForRefreshTaskId = taskId;
      return;
    }
    this.waitingForRefresh = false;

    this.taskForm.disable();

    if (taskId !== 'null') {

      this.id = taskId;

      this.roundService.getTaskById$(this.id, this.round.id).then(async (task) => {
        if (typeof task === 'undefined') {
          this.deepResetForm();
        } else if (task) {
          this.setAll(task);
        }
        this.savingInProgress = false;
      });

    } else {
      if (this.taskService.dayToApply) {

        if (this.asapSchedulerForDayToApplySub && !this.asapSchedulerForDayToApplySub.closed) {
          this.asapSchedulerForDayToApplySub.unsubscribe();
        }

        this.asapSchedulerForDayToApplySub = asapScheduler.schedule(() => {
          this.taskForm.get('daysOfTheWeek').get(this.taskService.dayToApply).setValue(true);
          this.taskService.dayToApply = null;
        });
      }

      this.savingInProgress = false;
      this.taskForm.enable();
    }

  }

  saveTask(): void {

    if (this.taskForm.disabled) {
      return;
    }

    if (this.nothingChanged()) {
      return;
    }

    if (!this.roundsService.roundSelected$.value) {
      return;
    }

    this.taskForm.disable();
    this.savingInProgress = true;

    const task = this.taskForm.getRawValue() as TaskForm;
    const trimDescription = task.description.trim();
    task.description = trimDescription;
    this.taskForm.get('description').setValue(trimDescription);

    httpsCallable(this.functions, 'saveTask')({
      task: {
        description: task.description,
        daysOfTheWeek: this.taskService.daysBooleanMapToDayArray(task.daysOfTheWeek),
        timesOfDay: task.timesOfDay
      },
      taskId: this.id,
      roundId: this.roundsService.roundSelected$.value.id
    }).then((result) => {
      const success = result.data as HTTPSuccess;

      this.zone.run(() => {
        if (success.created) {
          this.location.go(this.router.createUrlTree(['./', success.taskId], {relativeTo: this.route}).toString());
        }

        this.id = success.taskId;
        this.savingInProgress = false;
        this.initValues = this.taskForm.getRawValue();
        this.taskForm.enable();
        this.snackBar.open(success.details || 'Your operation has been done 😉');
      });
    }).catch((error: HTTPError) => {
      this.zone.run(() => {
        this.snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
        this.refreshTaskByParamId(this.id);
      });
    });
  }

  nothingChanged(): boolean {

    const raw = this.taskForm.getRawValue();

    return this.initValues.description.trim() === raw.description.trim() &&
      this.initValues.timesOfDay.toSet().hasOnly(raw.timesOfDay.toSet()) &&
      this.initValues.daysOfTheWeek.mon === raw.daysOfTheWeek.mon &&
      this.initValues.daysOfTheWeek.tue === raw.daysOfTheWeek.tue &&
      this.initValues.daysOfTheWeek.wed === raw.daysOfTheWeek.wed &&
      this.initValues.daysOfTheWeek.thu === raw.daysOfTheWeek.thu &&
      this.initValues.daysOfTheWeek.fri === raw.daysOfTheWeek.fri &&
      this.initValues.daysOfTheWeek.sat === raw.daysOfTheWeek.sat &&
      this.initValues.daysOfTheWeek.sun === raw.daysOfTheWeek.sun
  }

  deepResetForm(): void {
    this.taskForm.disable();
    this.resetId();
    this.restartForm();

    const roundSelected = this.roundsService.roundSelected$.value;
    let url: UrlTree;

    if (roundSelected) {
      url = this.router.createUrlTree(['/' + RouterDict.user + '/' + RouterDict.rounds + '/' + roundSelected.id + '/' + RouterDict.taskEditor], {relativeTo: this.route});
    } else {
      url = this.router.createUrlTree(['/' + RouterDict.user + '/' + RouterDict.roundsList]);
    }

    this.location.go(url.toString());
    this.taskForm.enable();
  }

  restartForm(): void {
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

    (this.taskForm.get('timesOfDay') as FormArray).clear();

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
        this.deletingInProgress = true;

        of(httpsCallable(this.functions, 'deleteTask')({
          taskId: this.id,
          roundId: this.round.id
        })).pipe(
          mergeMap((e) => e),
          mergeMap(async (e) => e.data)
        ).subscribe((success: HTTPSuccess) => {
          this.zone.run(() => {
            this.snackBar.open(success.details || 'Your operation has been done 😉');
            this.deepResetForm();
            this.deletingInProgress = false;
          });
        }, (error: HTTPError) => {
          this.zone.run(() => {
            this.snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
            this.refreshTaskByParamId(this.id);
          });
        });
      }

    });

  }

  setAll(task: Task): void {

    this.restartForm();
    this.taskForm.disable();

    this.taskForm.get('description').setValue(task.description);
    this.taskForm.get('daysOfTheWeek').setValue(this.taskService.dayArrayToDaysBooleanMap(task.daysOfTheWeek));

    (task.timesOfDay as string[]).forEach((timeOfDay) => {
      (this.taskForm.get('timesOfDay') as FormArray).push(new FormControl(timeOfDay.trim()));
    });

    this.initValues = this.initValues = this.taskForm.getRawValue();
    this.deletingInProgress = false;
    this.taskForm.enable();
  }

  removeTimeOfDay(index: number): void {
    (this.taskForm.get('timesOfDay') as FormArray).markAsDirty();
    (this.taskForm.get('timesOfDay') as FormArray).removeAt(index);
    this.applyFilter(this.taskForm.get('timeOfDay').value);
  }

  static daysOfTheWeekValidator(g: FormGroup): {required: boolean} {
    const rawValue = g.getRawValue();
    const some = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].some((checkbox) => rawValue[checkbox]);
    return some ? null : {required: true};
  }

  static timesOfDayValidator(g: FormArray): {required: boolean} {
    return g.value.length > 0 && g.value.length <= 10 ? null : {required: true};
  }
}
