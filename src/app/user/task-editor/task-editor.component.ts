import {Location} from '@angular/common';
import {ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {AngularFirestore} from '@angular/fire/firestore';
import {AngularFireFunctions} from '@angular/fire/functions';
import {FormControl, FormGroup} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import deepEqual from 'deep-equal';
import {Subscription} from 'rxjs';
import {tap} from 'rxjs/operators';
import {AuthService} from '../../auth/auth.service';
import {ITask} from '../models';
import {daysOfTheWeek, timesOfDay, timesOfDayDict} from '../models';

@Component({
  selector: 'app-task-editor',
  templateUrl: './task-editor.component.html',
  styleUrls: ['./task-editor.component.sass'],
  host: { class: 'app' }
})
export class TaskEditorComponent implements OnInit, OnDestroy {

  constructor(private authService: AuthService,
              private router: Router,
              private activeRoute: ActivatedRoute,
              private location: Location,
              private cdRef: ChangeDetectorRef,
              private fns: AngularFireFunctions,
              private afs: AngularFirestore) {
    this.taskForm.enable();
  }

  deepEqual = deepEqual;
  initValues: ITask;

  id = 'null';
  taskSubscriber: Subscription;

  daysOfTheWeek = daysOfTheWeek;
  timesOfDay = timesOfDay;
  timesOfDayDict = timesOfDayDict;

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
    timesOfDay: new FormGroup({
      duringTheDay: new FormControl(false),
      atDawn: new FormControl(false),
      morning: new FormControl(false),
      beforeNoon: new FormControl(false),
      atNoon: new FormControl(false),
      inTheAfternoon: new FormControl(false),
      beforeEvening: new FormControl(false),
      inTheEvening: new FormControl(false),
      inTheNight: new FormControl(false)
    }, TaskEditorComponent.timesOfDayValidator)
  });

  deleteTaskSubscription: Subscription;
  saveTaskSubscription: Subscription;

  savingInProgress = false;
  deletingInProgress = false;

  ngOnInit(): void  {
    this.subscribeTaskByParamId(this.activeRoute.snapshot.params.id || null);
  }

  ngOnDestroy(): void  {

    if (this.taskSubscriber && !this.taskSubscriber.closed) {
      this.taskSubscriber.unsubscribe();
    }

    if (this.deleteTaskSubscription && !this.deleteTaskSubscription.closed) {
      this.deleteTaskSubscription.unsubscribe();
    }

    if (this.saveTaskSubscription && !this.saveTaskSubscription.closed) {
      this.saveTaskSubscription.unsubscribe();
    }

  }

  resetId(): void  {
    this.id = 'null';
  }

  idIsNull(): boolean {
    return this.id === 'null';
  }

  subscribeTaskByParamId(taskId: string): void {

    if (taskId) {

      this.id = taskId;

      if (this.taskSubscriber && !this.taskSubscriber.closed) {
        this.taskSubscriber.unsubscribe();
      }

      this.taskForm.disable();

      this.taskSubscriber = this.afs.doc(`users/${this.authService.userData.uid}/`)
        .collection('task').doc(this.id).snapshotChanges().subscribe((change) => {
        const task = change.payload.data() as ITask;
        if (!task) {
          this.taskForm.reset();
          this.resetId();
          this.location.go('/user/task-editor');
        } else {
          this.setAll(task);
        }
        this.taskForm.enable();
      });

    } else {
      this.initValues = {} as ITask;
      this.taskForm.enable();
    }

  }

  saveTask(): void {

    if (this.saveTaskSubscription && !this.saveTaskSubscription.closed) {
      this.saveTaskSubscription.unsubscribe();
    }

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

    if (deepEqual(this.initValues, this.taskForm.getRawValue())) {
      return;
    }

    this.taskForm.disable();
    this.savingInProgress = true;

    const task: ITask = this.taskForm.getRawValue();

    // call onCall functions
    // get
    // if created, taskId
    // if created == true then subscribe

    // saveTask
    // transaction
    // set, update         => user/{userId}/task/{taskId}
    // set, update, delete => user/{userId}/today/{[mon, tue, wed, thu, fri, sat, sun]}/task/{taskId}

    console.log(task, this.id);

    this.saveTaskSubscription = this.fns.httpsCallable('saveTask')({
      task,
      taskId: this.id
    }).subscribe((data) => {

      if (data.created) {
        this.location.go('/user/task-editor/' + data.taskId);
        this.subscribeTaskByParamId(data.taskId);
      }

      this.taskForm.reset(this.taskForm.value);

    }, (error) => {
      console.log(error);
      this.taskForm.enable();
      this.savingInProgress = false;
    }, () => {
      this.taskForm.enable();
      this.savingInProgress = false;
    });

  }

  cancelTask(): Promise<boolean> {
    return this.router.navigate(['/user/tasks-list']);
  }

  deepResetForm(): void {
    this.location.go('/user/task-editor');
    this.resetId();
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
      },
      timesOfDay: {
        duringTheDay: false,
        atDawn: false,
        morning: false,
        beforeNoon: false,
        atNoon: false,
        inTheAfternoon: false,
        beforeEvening: false,
        inTheEvening: false,
        inTheNight: false
      }
    });
    if (this.taskSubscriber && !this.taskSubscriber.closed) {
      this.taskSubscriber.unsubscribe();
    }
    this.taskForm.disable();
  }

  deleteTask(): void {

    this.taskForm.disable();
    this.deletingInProgress = true;

    if (this.deleteTaskSubscription && !this.deleteTaskSubscription.closed) {
      this.deleteTaskSubscription.unsubscribe();
    }

    this.deleteTaskSubscription = this.fns.httpsCallable('deleteTask')({taskId: this.id}).subscribe((next) => {
      console.log(next);
      this.deepResetForm();
    }, (error) => {
      console.log(error);
      this.taskForm.enable();
      this.deletingInProgress = false;
    }, () => {
      this.taskForm.enable();
      this.deletingInProgress = false;
    });

  }

  setAll(task: ITask): void {
    this.initValues = task;
    this.taskForm.setValue(task);
    this.taskForm.disable();
  }

  onDuringTheDayChange(): void {

    const duringTheDayChecked = this.taskForm.get('timesOfDay.duringTheDay').value;

    this.timesOfDay.forEach((timeOfDay) => {
      if (duringTheDayChecked) {
        this.taskForm.get('timesOfDay').get(timeOfDay).disable();
      } else {
        this.taskForm.get('timesOfDay').get(timeOfDay).enable();
      }
    });

  }

  static daysOfTheWeekValidator(g: FormGroup): { required: boolean } {
    const toValid = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const rawValue = g.getRawValue();
    const some = toValid.some((checkbox) => rawValue[checkbox]);
    return some ? null : { required: true };
  }

  static timesOfDayValidator(g: FormGroup): { required: boolean } {
    const toValid = [
      'duringTheDay', 'atDawn', 'morning', 'beforeNoon', 'atNoon', 'inTheAfternoon', 'beforeEvening', 'inTheEvening', 'inTheNight'
    ];
    return toValid.some((checkbox) => g.get(checkbox).value) ? null : { required: true };
  }

  static descriptionValidator(g: FormControl): { required: boolean } {
    const reg = /^\d+$/;
    return (typeof g.value === 'string') &&
    (!reg.test(g.value)) && (g.value.length > 3) && (g.value.length <= 100) ? null : { required: true };
  }

}
