import {DOCUMENT, Location} from '@angular/common';
import {Component, Inject, OnDestroy, OnInit} from '@angular/core';
import {AngularFireFunctions} from '@angular/fire/functions';
import {AbstractControl, FormArray, FormControl, FormGroup} from '@angular/forms';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';
import {faCheckCircle, faPlus} from '@fortawesome/free-solid-svg-icons';
import deepEqual from 'deep-equal';
import {Subscription} from 'rxjs';
import {AppService} from '../../app-service';
import {AuthService} from '../../auth/auth.service';
import {IError, ISuccess, ITask} from '../models';
import {UserService} from '../user.service';
import {TimeOfDayDialogComponent} from './dialog/time-of-day-dialog.component';

export const listEqual = <T>(A: T[], B: T[]): boolean =>
  A.length === B.length && A.every((a) => B.includes(a)) && B.every((b) => A.includes(b));

@Component({
  selector: 'app-task-editor',
  templateUrl: './task-editor.component.html',
  styleUrls: ['./task-editor.component.sass'],
  host: {class: 'app'}
})
export class TaskEditorComponent implements OnInit, OnDestroy {

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
              private userService: UserService) {
  }

  initValues: ITask = {
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
    description: new FormControl('', TaskEditorComponent.descriptionValidator),
    daysOfTheWeek: new FormGroup({
      mon: new FormControl(false),
      tue: new FormControl(false),
      wed: new FormControl(false),
      thu: new FormControl(false),
      fri: new FormControl(false),
      sat: new FormControl(false),
      sun: new FormControl(false)
    }, TaskEditorComponent.daysOfTheWeekValidator),
    timesOfDay: new FormArray([], TaskEditorComponent.timesOfDayValidator)
  });

  savingInProgress = false;
  deletingInProgress = false;
  isConnected$: Subscription;

  ngOnInit(): void {
    this.taskForm.enable();
    this.isConnected$ = this.appService.isConnected$.subscribe((isConnected) => {
      if (isConnected) {
        this.refreshTaskByParamId(this.activeRoute.snapshot.params.id || 'null');
      }
    });
  }

  ngOnDestroy(): void {
    this.isConnected$.unsubscribe();
  }

  openTimeOfDayDialog(): void {

    // @ts-ignore
    const scrollY = window.scrollY;

    // @ts-ignore
    const scrollX = window.scrollX;
    const html = this.document.documentElement;

    // this changes scrollY, scrollX, html
    const dialogRef = this.dialog.open(TimeOfDayDialogComponent, {
      width: '250px'
    });

    dialogRef.afterOpened().subscribe(() => {
      this.appService.dialogOpen = true;
    });

    // apply if dialogRef.open forgot to add
    if (this.appService.hasScrollbar()) {
      html.style.top = -scrollY + 'px';
      html.style.left = -scrollX + 'px';
      html.classList.add('cdk-global-scrollblock');
    }

    dialogRef.afterClosed().subscribe((timeOfDay) => {

      // apply if dialogRef.open forgot to add
      html.removeAttribute('style');
      html.classList.remove('cdk-global-scrollblock');
      html.scrollTop = scrollY;
      html.scrollLeft = scrollX;

      this.taskForm.get('timesOfDay').markAsDirty();

      if (this.taskForm.get('timesOfDay').get(timeOfDay)) {
        this.snackBar.open('Enter new one');
      }
      if (!timeOfDay || timeOfDay.trim().length === 0 || timeOfDay.trim().length > 20) {
        this.snackBar.open('Enter time of day length from 1 to 20');
      } else {
        (this.taskForm.get('timesOfDay') as FormArray).push(new FormControl(timeOfDay.trim()));
        this.getDeepEqual();
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
        if (!task) {
          this.resetId();
          this.location.go('/user/task-editor');
          this.taskForm.enable();
        } else {
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

    let isInvalid = 0;

    if (!this.taskForm.get('daysOfTheWeek').valid) {
      this.taskForm.get('daysOfTheWeek').markAsDirty();
      ++isInvalid;
    }

    if (!this.taskForm.get('timesOfDay').valid) {
      this.taskForm.get('timesOfDay').markAsDirty();
      ++isInvalid;
    }

    if (!this.taskForm.get('description').valid) {
      this.taskForm.get('description').markAsDirty();
      ++isInvalid;
    }

    if (isInvalid) {
      return;
    }

    if (this.getDeepEqual()) {
      return;
    }

    this.taskForm.disable();
    this.savingInProgress = true;

    const task = this.taskForm.getRawValue();

    // call onCall functions
    // get
    // if created, taskId
    // if created == true then subscribe

    // saveTask
    // transaction
    // set, update         => user/{userId}/task/{taskId}
    // set, update, delete => user/{userId}/today/{[mon, tue, wed, thu, fri, sat, sun]}/task/{taskId}

    this.fns.httpsCallable('saveTask')({
      task,
      taskId: this.id
    }).subscribe((success: ISuccess) => {

      if (success.created) {
        this.location.go('/user/task-editor/' + success.taskId);
      }

      this.id = success.taskId;
      this.savingInProgress = false;
      this.initValues = task;
      this.taskForm.enable();
      this.snackBar.open(success.details);

    }, (error: IError) => {
      this.snackBar.open(error.details && typeof error.details === 'string' ? error.details : 'Some went wrong 🤫 Try again 🙂');
      this.refreshTaskByParamId(this.id);
    });

  }

  cancelTask(): Promise<boolean> {
    return this.router.navigate(['/user/tasks-list']);
  }

  deepResetForm(): void {
    this.taskForm.disable();
    this.resetId();
    this.restartForm();
    this.location.go('/user/task-editor');
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

    this.taskForm.disable();
    this.deletingInProgress = true;

    this.fns.httpsCallable('deleteTask')({taskId: this.id}).subscribe((success: ISuccess) => {
      this.snackBar.open(success.details);
      this.deepResetForm();
      this.deletingInProgress = false;
    }, (error: IError) => {
      this.snackBar.open(error.details && typeof error.details === 'string' ? error.details : 'Some went wrong 🤫 Try again 🙂');
      this.refreshTaskByParamId(this.id);
    });

  }

  setAll(task: ITask): void {

    this.restartForm();
    this.taskForm.disable();
    this.initValues = task;
    this.taskForm.get('description').setValue(task.description);
    this.taskForm.get('daysOfTheWeek').setValue(task.daysOfTheWeek);

    (task.timesOfDay as string[]).forEach((timeOfDay) => {
      (this.taskForm.get('timesOfDay') as FormArray).push(new FormControl(timeOfDay.trim()));
    });

    this.taskForm.enable();
  }

  removeTimeOfDay(index: number): void {
    (this.taskForm.get('timesOfDay') as FormArray).removeAt(index);
  }

  getDeepEqual(): boolean {
    const rawValue = this.taskForm.getRawValue();

    return this.initValues.description === rawValue['description'] &&
      deepEqual(this.initValues.daysOfTheWeek, rawValue['daysOfTheWeek']) &&
      listEqual(this.initValues.timesOfDay, rawValue['timesOfDay']);
  }

  static daysOfTheWeekValidator(g: FormGroup): { required: boolean } {
    const toValid = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const rawValue = g.getRawValue();
    const some = toValid.some((checkbox) => rawValue[checkbox]);
    return some ? null : {required: true};
  }

  static descriptionValidator(g: FormControl): { required: boolean } {
    return (typeof g.value === 'string') &&
    (g.value.length > 3) && (g.value.length <= 40) ? null : {required: true};
  }

  static timesOfDayValidator(g: FormArray): { required: boolean } {
    return g.value.length > 0 && g.value.length <= 20 ? null : {required: true};
  }

}
