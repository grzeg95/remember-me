import {Component, HostListener, OnDestroy, OnInit} from '@angular/core';
import {FormControl, FormGroup} from '@angular/forms';
import {MatDialogRef} from '@angular/material/dialog';
import {performance} from 'firebase';

@Component({
  selector: 'app-dialog',
  templateUrl: 'time-of-day-dialog.component.html',
  styleUrls: ['time-of-day-dialog.component.sass'],
})
export class TimeOfDayDialogComponent implements OnInit, OnDestroy {

  perf = performance();
  timeOfDayDialogComponentTrace = this.perf.trace('TimeOfDayDialogComponent');

  timeOfDayForm: FormGroup = new FormGroup({
    timeOfDay: new FormControl('', [TimeOfDayDialogComponent.timeOfDayValidator])
  });

  constructor(public dialogRef: MatDialogRef<TimeOfDayDialogComponent>) {
  }

  ngOnInit(): void {
    this.timeOfDayDialogComponentTrace.start();
  }

  ngOnDestroy(): void {
    this.timeOfDayDialogComponentTrace.stop();
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

  static timeOfDayValidator(g: FormControl): { required: boolean } {

    const current = g.value as string;
    const trim = (g.value as string).trimLeft();

    if (current.length !== trim.length) {
      g.setValue(trim);
    }

    return (typeof g.value === 'string') &&
    (g.value.length > 0) && (g.value.length <= 20) ? null : {required: true};
  }

}
