import {DOCUMENT, Location} from '@angular/common';
import {Component, Inject, OnDestroy, OnInit} from '@angular/core';
import {AngularFireFunctions} from '@angular/fire/functions';
import {AbstractControl, FormArray, FormControl, FormGroup} from '@angular/forms';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';
import {faCheckCircle, faPlus} from '@fortawesome/free-solid-svg-icons';
import deepEqual from 'deep-equal';
import {performance} from 'firebase';
import {Subscription} from 'rxjs';
import {AppService} from '../../app-service';
import {RouterDict} from '../../app.constants';
import {AuthService} from '../../auth/auth.service';
import {HTTPError, HTTPSuccess, Task} from '../models';
import {UserService} from '../user.service';
import {TaskDialogConfirmDeleteComponent} from './task-dialog-confirm-delete/task-dialog-confirm-delete.component';
import {TaskDialogTimeOfDay} from './task-dialog-time-of-day/task-dialog-time-of-day.component';

export const listEqual = <T>(A: T[], B: T[]): boolean =>
  A.length === B.length && A.every((a) => B.includes(a)) && B.every((b) => A.includes(b));

@Component({
  selector: 'app-task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.sass'],
  host: {class: 'app'}
})
export class TaskComponent implements OnInit, OnDestroy {

  perf = performance();
  taskEditorComponentTrace = this.perf.trace('TaskComponent');

  faCheckCircle = faCheckCircle;
  faPlus = faPlus;

  get timesOfDay(): AbstractControl[] {
    return (this.taskForm.get('timesOfDay') as FormArray).controls;
  }

  constructor(private authService: AuthService,
              private router: Router,
              private activeRoute: ActivatedRoute,
              private location: Location,
              private fns: AngularFireFunctions,
              public dialog: MatDialog,
              @Inject(DOCUMENT) private document: Document,
              private snackBar: MatSnackBar,
              private appService: AppService,
              private userService: UserService) {}

  initValues: Task = {
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
  isConnected$: Subscription;

  ngOnInit(): void {
    this.taskEditorComponentTrace.start();
    this.taskForm.enable();
    this.isConnected$ = this.appService.isConnected$.subscribe((isConnected) => {
      if (isConnected) {
        this.refreshTaskByParamId(this.activeRoute.snapshot.params.id || 'null');
      }
    });
  }

  ngOnDestroy(): void {
    this.isConnected$.unsubscribe();
    this.taskEditorComponentTrace.stop();
  }

  openTimeOfDayDialog(): void {

    if (this.appService.dialogOpen) {
      return;
    }

    const dialogRef = this.dialog.open(TaskDialogTimeOfDay);

    dialogRef.afterOpened().subscribe(() => {
      this.appService.dialogOpen = true;
    });

    dialogRef.afterClosed().subscribe((timeOfDay) => {

      this.taskForm.get('timesOfDay').markAsDirty();

      if (this.taskForm.get('timesOfDay').get(timeOfDay)) {
        this.snackBar.open('Enter new one');
      }

      if (timeOfDay && timeOfDay.trim().length > 20) {
        this.snackBar.open('Enter time of day length from 1 to 20');
      } else if (((this.taskForm.get('timesOfDay') as FormArray).value as string[]).length === 20) {
        this.snackBar.open('Up to 20 times of day per task');
      } else if (timeOfDay && !((this.taskForm.get('timesOfDay') as FormArray).value as string[]).includes(timeOfDay.trim())) {
        (this.taskForm.get('timesOfDay') as FormArray).push(new FormControl(timeOfDay.trim()));
      }

      this.appService.dialogOpen = false;

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

      this.userService.getTaskById$(this.id).subscribe((task) => {
        if (typeof task === 'undefined') {
          this.resetId();
          this.location.go('/' + RouterDict['user'] + '/' + RouterDict['task']);
          this.taskForm.enable();
        } else if (!task) {
          this.setAll(task);
        }
        this.savingInProgress = false;
      });

    } else {
      this.savingInProgress = false;
      this.taskForm.enable();
    }

  }

  saveTask(): void {

    if (this.isDeepEqual()) {
      return;
    }

    this.taskForm.disable();
    this.savingInProgress = true;

    const task = this.taskForm.getRawValue() as Task;
    const trimDescription = task.description.trim();
    task.description = trimDescription;
    this.taskForm.get('description').setValue(trimDescription);

    this.fns.httpsCallable('saveTask')({
      task,
      taskId: this.id
    }).subscribe((success: HTTPSuccess) => {

      if (success.created) {
        this.location.go('/' + RouterDict['user'] + '/' + RouterDict['task'] + '/' + success.taskId);
      }

      this.id = success.taskId;
      this.savingInProgress = false;
      this.initValues = task;
      this.taskForm.enable();
      this.snackBar.open(success.details);

    }, (error: HTTPError) => {
      if (error.code === 'permission-denied') {
        this.authService.signOut();
        return;
      }
      this.snackBar.open('Some went wrong 🤫 Try again 🙂');
      this.refreshTaskByParamId(this.id);
    });

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
  }

  deleteTask(): void {

    if (this.appService.dialogOpen) {
      return;
    }

    const dialogRef = this.dialog.open(TaskDialogConfirmDeleteComponent);

    dialogRef.afterOpened().subscribe(() => {
      this.appService.dialogOpen = true;
    });

    dialogRef.afterClosed().subscribe((isConfirmed) => {

      if (isConfirmed) {
        this.taskForm.disable();
        this.deletingInProgress = true;

        this.fns.httpsCallable('deleteTask')({taskId: this.id}).subscribe((success: HTTPSuccess) => {
          this.snackBar.open(success.details);
          this.deepResetForm();
          this.deletingInProgress = false;
        }, (error: HTTPError) => {
          if (error.code === 'permission-denied') {
            this.authService.signOut();
            return;
          }
          this.snackBar.open(error.details && typeof error.details === 'string' ? error.details : 'Some went wrong 🤫 Try again 🙂');
          this.refreshTaskByParamId(this.id);
        });
      }

      this.appService.dialogOpen = false;

    });

  }

  setAll(task: Task): void {

    this.restartForm();
    this.taskForm.disable();
    this.initValues = task;
    this.taskForm.get('description').setValue(task.description);
    this.taskForm.get('daysOfTheWeek').setValue(task.daysOfTheWeek);

    (task.timesOfDay as string[]).forEach((timeOfDay) => {
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

  isDeepEqual(): boolean {
    const rawValue = this.taskForm.getRawValue();

    return this.initValues.description.length === rawValue['description'].trim().length &&
      deepEqual(this.initValues.daysOfTheWeek, rawValue['daysOfTheWeek']) &&
      listEqual(this.initValues.timesOfDay, rawValue['timesOfDay']);
  }

  static daysOfTheWeekValidator(g: FormGroup): { required: boolean } {
    const rawValue = g.getRawValue();
    const some = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].some((checkbox) => rawValue[checkbox]);
    return some ? null : {required: true};
  }

  static descriptionValidator(g: FormControl): { required: boolean } {

    const current = g.value as string;
    const trim = (g.value as string).trimLeft();

    if (current.length !== trim.length) {
      g.setValue(trim);
    }

    return (typeof g.value === 'string') &&
    (g.value.length > 3) && (g.value.length <= 40) ? null : {required: true};
  }

  static timesOfDayValidator(g: FormArray): { required: boolean } {
    return g.value.length > 0 && g.value.length <= 20 ? null : {required: true};
  }

}
