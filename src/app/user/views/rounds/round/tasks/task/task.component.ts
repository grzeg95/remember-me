import {ENTER} from '@angular/cdk/keycodes';
import {Location} from '@angular/common';
import {Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {AngularFireFunctions} from '@angular/fire/compat/functions';
import {AbstractControl, FormArray, FormControl, FormGroup} from '@angular/forms';
import {MatAutocompleteSelectedEvent, MatAutocompleteTrigger} from '@angular/material/autocomplete';
import {MatChipInputEvent} from '@angular/material/chips';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router, UrlTree} from '@angular/router';
import {asapScheduler, BehaviorSubject, Observable, Subscription} from 'rxjs';
import '../../../../../../../../global.prototype';
import {startWith} from 'rxjs/operators';
import {AppService} from '../../../../../../app-service';
import {RouterDict} from '../../../../../../app.constants';
import {HTTPError, HTTPSuccess, ITask, ITaskFirestore, Round, Task} from '../../../../../models';
import {TaskDialogConfirmDeleteComponent} from './task-dialog-confirm-delete/task-dialog-confirm-delete.component';
import {TaskService} from './task.service';
import {RoundService} from '../../round.service';
import {RoundsService} from '../../../rounds.service';

@Component({
  selector: 'app-task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.scss']
})
export class TaskComponent implements OnInit, OnDestroy {
  private waitingForRefresh: boolean;
  private waitingForRefreshTaskId: string;

  get description(): AbstractControl {
    return this.taskForm.get('description');
  }

  get daysOfTheWeek(): FormGroup {
    return this.taskForm.get('daysOfTheWeek') as FormGroup;
  }

  get timesOfDay(): FormArray {
    return this.taskForm.get('timesOfDay') as FormArray;
  }

  get isOnline$(): Observable<boolean> {
    return this.appService.isOnline$;
  }

  initValues: Task = new Task({
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
  });
  id = 'null';
  taskForm: FormGroup = new FormGroup({
    description: new FormControl('', TaskComponent.descriptionValidator),
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
  savingInProgress = false;
  deletingInProgress = false;
  filteredOptions$: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
  separatorKeysCodes: number[] = [ENTER];
  options: string[] = [];
  @ViewChild(MatAutocompleteTrigger, {read: MatAutocompleteTrigger}) input: MatAutocompleteTrigger;
  @ViewChild('basicInput') basicInput: ElementRef<HTMLInputElement>;
  lastTwoInputs = [];
  round: Round;
  getTaskByIdSub: Subscription;
  roundSelectedSub: Subscription;
  isConnectedSub: Subscription;
  roundsOrderSub: Subscription;
  timeOfDayValueChanges: Subscription;
  asapSchedulerForDayToApplySub: Subscription;
  saveTaskSub: Subscription;

  constructor(
      private activeRoute: ActivatedRoute,
      private location: Location,
      private fns: AngularFireFunctions,
      public dialog: MatDialog,
      private snackBar: MatSnackBar,
      private appService: AppService,
      private roundService: RoundService,
      private zone: NgZone,
      private taskService: TaskService,
      private roundsService: RoundsService,
      private router: Router,
      private route: ActivatedRoute
  ) {}

  ngOnInit(): void {

    this.taskForm.enable();
    this.isConnectedSub = this.isOnline$.subscribe((isConnected) => {
      if (isConnected) {
        this.refreshTaskByParamId(this.activeRoute.snapshot.params.id || 'null');
      } else {
        this.taskForm.disable();
      }
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

    if (this.isConnectedSub && !this.isConnectedSub.closed) {
      this.isConnectedSub.unsubscribe();
    }

    if (this.getTaskByIdSub && !this.getTaskByIdSub.closed) {
      this.getTaskByIdSub.unsubscribe();
    }

    if (this.roundsOrderSub && !this.roundsOrderSub.closed) {
      this.roundsOrderSub.unsubscribe();
    }

    if (this.timeOfDayValueChanges && !this.timeOfDayValueChanges.closed) {
      this.timeOfDayValueChanges.unsubscribe();
    }

    if (this.roundSelectedSub && !this.roundSelectedSub.closed) {
      this.roundSelectedSub.unsubscribe();
    }

    if (this.asapSchedulerForDayToApplySub && !this.asapSchedulerForDayToApplySub.closed) {
      this.asapSchedulerForDayToApplySub.unsubscribe();
    }

    if (this.saveTaskSub && !this.saveTaskSub.closed) {
      this.saveTaskSub.unsubscribe();
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

      if (this.getTaskByIdSub && !this.getTaskByIdSub.closed) {
        this.getTaskByIdSub.unsubscribe();
      }

      this.getTaskByIdSub = this.roundService.getTaskById$(this.id, this.round.id).subscribe((iTask) => {
        if (typeof iTask === 'undefined') {
          this.deepResetForm();
        } else if (iTask) {
          this.setAll(iTask);
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

    const iTask = this.taskForm.getRawValue() as ITask;
    const trimDescription = iTask.description.trim();
    iTask.description = trimDescription;
    this.taskForm.get('description').setValue(trimDescription);
    delete iTask['timeOfDay'];

    const iTaskFirestore: ITaskFirestore = {
      description: iTask.description,
      daysOfTheWeek: this.taskService.daysBooleanMapToDayArray(iTask.daysOfTheWeek),
      timesOfDay: iTask.timesOfDay
    };

    this.saveTaskSub = this.fns.httpsCallable('saveTask')({
      task: iTaskFirestore,
      taskId: this.id,
      roundId: this.roundsService.roundSelected$.value.id
    }).subscribe((success: HTTPSuccess) => {
      this.zone.run(() => {
        if (success.created) {
          this.location.go(this.router.createUrlTree(['./', success.taskId], {relativeTo: this.route}).toString());
        }

        this.id = success.taskId;
        this.savingInProgress = false;
        this.initValues = new Task(iTask);
        this.taskForm.enable();
        this.snackBar.open(success.details || 'Your operation has been done 😉');
      });
    }, (error: HTTPError) => {
      this.zone.run(() => {
        this.snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
        this.refreshTaskByParamId(this.id);
      });
    });
  }

  nothingChanged(): boolean {
    return this.initValues.isEquals(this.taskForm.getRawValue() as ITask);
  }

  deepResetForm(): void {
    this.taskForm.disable();
    this.resetId();
    this.restartForm();

    const roundSelected = this.roundsService.roundSelected$.value;
    let url: UrlTree;

    if (roundSelected) {
      url = this.router.createUrlTree(['./' + RouterDict.user + '/' + RouterDict.roundsList + '/' + roundSelected.id + '/' + RouterDict.taskEditor], {relativeTo: this.route});
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

    this.initValues = new Task({
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
    });
  }

  deleteTask(): void {

    const dialogRef = this.dialog.open(TaskDialogConfirmDeleteComponent);

    dialogRef.afterClosed().subscribe((isConfirmed) => {

      if (isConfirmed) {
        this.taskForm.disable();
        this.deletingInProgress = true;

        this.fns.httpsCallable('deleteTask')({
          taskId: this.id,
          roundId: this.round.id
        }).subscribe((success: HTTPSuccess) => {
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

  setAll(iTask: ITask): void {

    this.restartForm();
    this.taskForm.disable();
    this.initValues = new Task(iTask);
    this.taskForm.get('description').setValue(iTask.description);
    this.taskForm.get('daysOfTheWeek').setValue(iTask.daysOfTheWeek);

    (iTask.timesOfDay as string[]).forEach((timeOfDay) => {
      (this.taskForm.get('timesOfDay') as FormArray).push(new FormControl(timeOfDay.trim()));
    });

    this.deletingInProgress = false;
    this.taskForm.enable();
  }

  removeTimeOfDay(index: number): void {
    (this.taskForm.get('timesOfDay') as FormArray).markAsDirty();
    (this.taskForm.get('timesOfDay') as FormArray).removeAt(index);
    this.applyFilter(this.taskForm.get('timeOfDay').value);
  }

  static daysOfTheWeekValidator(g: FormGroup): { required: boolean } {
    const rawValue = g.getRawValue();
    const some = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].some((checkbox) => rawValue[checkbox]);
    return some ? null : {required: true};
  }

  static descriptionValidator(g: FormControl): { required: boolean } {

    const current = g.value as string;
    const trimLeft = (g.value as string).trimLeft();

    if (current.length !== trimLeft.length) {
      g.setValue(trimLeft);
    }

    return (typeof g.value === 'string') && (g.value.trim().length > 0) && (g.value.trim().length <= 256) ? null : {required: true};
  }

  static timesOfDayValidator(g: FormArray): { required: boolean } {
    return g.value.length > 0 && g.value.length <= 10 ? null : {required: true};
  }
}
