import {Component, HostListener, OnDestroy, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
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
    timeOfDay: new FormControl('', [Validators.required, Validators.maxLength(20)])
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
    this.dialogRef.close(this.timeOfDayForm.get('timeOfDay').value);
  }

}
