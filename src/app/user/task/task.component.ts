import {Location} from '@angular/common';
import {Component, NgZone, OnDestroy, OnInit} from '@angular/core';
import {AngularFireFunctions} from '@angular/fire/functions';
import {AbstractControl, FormArray, FormControl, FormGroup} from '@angular/forms';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute} from '@angular/router';
import {faCheckCircle, faPlus} from '@fortawesome/free-solid-svg-icons';
import {Observable, Subscription} from 'rxjs';
import '../../../../global.prototype';
import {AppService} from '../../app-service';
import {RouterDict} from '../../app.constants';
import {HTTPError, HTTPSuccess, ITask, Task} from '../models';
import {UserService} from '../user.service';
import {TaskDialogConfirmDeleteComponent} from './task-dialog-confirm-delete/task-dialog-confirm-delete.component';
import {TaskDialogTimeOfDay} from './task-dialog-time-of-day/task-dialog-time-of-day.component';

@Component({
  selector: 'app-task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.scss']
})
export class TaskComponent implements OnInit, OnDestroy {

  get timesOfDay(): AbstractControl[] {
    return (this.taskForm.get('timesOfDay') as FormArray).controls;
  }

  get isConnected$(): Observable<boolean> {
    return this.appService.isConnected$;
  }

  faCheckCircle = faCheckCircle;
  faPlus = faPlus;
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
    timesOfDay: new FormArray([] as AbstractControl[], TaskComponent.timesOfDayValidator)
  });
  savingInProgress = false;
  deletingInProgress = false;
  isConnectedSub: Subscription;

  constructor(private activeRoute: ActivatedRoute,
              private location: Location,
              private fns: AngularFireFunctions,
              public dialog: MatDialog,
              private snackBar: MatSnackBar,
              private appService: AppService,
              private userService: UserService,
              private zone: NgZone) {}

  ngOnInit(): void {
    this.userService.runTimesOfDayOrder();
    this.taskForm.enable();
    this.isConnectedSub = this.isConnected$.subscribe((isConnected) => {
      if (isConnected) {
        this.refreshTaskByParamId(this.activeRoute.snapshot.params.id || 'null');
      } else {
        this.taskForm.disable();
      }
    });
  }

  ngOnDestroy(): void {
    this.isConnectedSub.unsubscribe();
  }

  openTimeOfDayDialog(): void {

    const dialogRef = this.dialog.open(TaskDialogTimeOfDay, {
      autoFocus: false
    });
    dialogRef.componentInstance.selectedTimesOfDay = this.taskForm.get('timesOfDay').value;

    dialogRef.afterClosed().subscribe((timeOfDayValue) => {

      if (!timeOfDayValue) {
        this.taskForm.get('timesOfDay').clearValidators();
        return;
      }

      this.taskForm.get('timesOfDay').markAsDirty();

      const timeOfDay = timeOfDayValue.trim().encodeFirebaseSpecialCharacters();

      if ((this.taskForm.get('timesOfDay').value as string[]).includes(timeOfDay)) {
        this.snackBar.open('Enter new one');
      } else if (timeOfDay.length > 20) {
        this.snackBar.open('Enter time of day length from 1 to 20');
      } else if (((this.taskForm.get('timesOfDay') as FormArray).value as string[]).length > 20) {
        this.snackBar.open('Up to 20 times of day per task');
      } else {
        (this.taskForm.get('timesOfDay') as FormArray).push(new FormControl(timeOfDay));
      }

    });

  }

  resetId(): void {
    this.id = 'null';
  }

  idIsNull(): boolean {
    return this.id === 'null';
  }

  refreshTaskByParamId(taskId: string): void {

    this.taskForm.disable();

    if (taskId !== 'null') {

      this.id = taskId;

      this.userService.getTaskById$(this.id).subscribe((iTask) => {
        if (typeof iTask === 'undefined') {
          this.resetId();
          this.location.go('/' + RouterDict['user'] + '/' + RouterDict['task']);
          this.taskForm.enable();
        } else if (iTask) {
          this.setAll(iTask);
        }
        this.savingInProgress = false;
      });

    } else {
      this.savingInProgress = false;
      this.taskForm.enable();
    }

  }

  saveTask(): void {

    if (this.nothingChanged()) {
      return;
    }

    this.taskForm.disable();
    this.savingInProgress = true;

    const iTask = this.taskForm.getRawValue() as ITask;
    const trimDescription = iTask.description.trim();
    iTask.description = trimDescription;
    this.taskForm.get('description').setValue(trimDescription);

    this.fns.httpsCallable('saveTask')({
      task: iTask,
      taskId: this.id
    }).subscribe((success: HTTPSuccess) => {
      this.zone.run(() => {
        if (success.created) {
          this.location.go('/' + RouterDict['user'] + '/' + RouterDict['task'] + '/' + success.taskId);
        }

        this.id = success.taskId;
        this.savingInProgress = false;
        this.initValues = new Task(iTask);
        this.taskForm.enable();
        this.snackBar.open(success.details || 'Your operation has been done 😉');
      });
    }, (error: HTTPError) => {
      this.zone.run(() => {
        console.log(error);
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
    this.location.go('/' + RouterDict['user'] + '/' + RouterDict['task']);
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

        this.fns.httpsCallable('deleteTask')({taskId: this.id}).subscribe((success: HTTPSuccess) => {
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

  removeTimeOfDay($event: MouseEvent, index: number): void {
    $event.preventDefault();
    (this.taskForm.get('timesOfDay') as FormArray).markAsDirty();
    (this.taskForm.get('timesOfDay') as FormArray).removeAt(index);
  }

  decodeFirebaseSpecialCharacters(str: string): string {
    return str.decodeFirebaseSpecialCharacters();
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

    return (typeof g.value === 'string') && (g.value.trim().length > 3) && (g.value.trim().length <= 40) ? null : {required: true};
  }

  static timesOfDayValidator(g: FormArray): { required: boolean } {
    return g.value.length > 0 && g.value.length <= 20 ? null : {required: true};
  }

}
