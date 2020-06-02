import {Component, HostListener, OnDestroy, OnInit} from '@angular/core';
import {FormControl, FormGroup} from '@angular/forms';
import {MatDialogRef} from '@angular/material/dialog';
import {performance} from 'firebase';

@Component({
  selector: 'app-task-dialog-time-of-day',
  templateUrl: 'task-dialog-time-of-day.component.html',
  styleUrls: ['task-dialog-time-of-day.component.sass'],
})
export class TaskDialogTimeOfDay implements OnInit, OnDestroy {

  perf = performance();
  taskDialogTimeOfDayTrace = this.perf.trace('TaskDialogTimeOfDay');

  timeOfDayForm: FormGroup = new FormGroup({
    timeOfDay: new FormControl('', [
      TaskDialogTimeOfDay.timeOfDayValidatorLength,
      TaskDialogTimeOfDay.timeOfDayValidatorSlash]
    )
  });

  constructor(public dialogRef: MatDialogRef<TaskDialogTimeOfDay>) {}

  ngOnInit(): void {
    this.taskDialogTimeOfDayTrace.start();
  }

  ngOnDestroy(): void {
    this.taskDialogTimeOfDayTrace.stop();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Enter' && this.timeOfDayForm.get('timeOfDay').valid) {
      this.addTimeOfDay();
    }
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  addTimeOfDay(): void {
    this.dialogRef.close(this.timeOfDayForm.get('timeOfDay').value.trim());
  }

  static timeOfDayValidatorLength(g: FormControl): { required: boolean } {

    const current = g.value as string;
    const trim = (g.value as string).trimLeft();

    if (current.length !== trim.length) {
      g.setValue(trim);
    }

    return (typeof g.value === 'string') &&
    (g.value.length > 0) && (g.value.length <= 20) ? null : {required: true};
  }

  static timeOfDayValidatorSlash(g: FormControl): { slash: boolean } {
    return (typeof g.value === 'string') && !g.value.includes('/') ? null : {slash: true};
  }

}
