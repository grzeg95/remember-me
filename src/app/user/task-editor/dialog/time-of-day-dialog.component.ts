import {Component, HostListener} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {MatDialogRef} from '@angular/material/dialog';

@Component({
  selector: 'app-dialog',
  templateUrl: 'time-of-day-dialog.component.html',
  styleUrls: ['time-of-day-dialog.component.sass'],
})
export class TimeOfDayDialogComponent {

  timeOfDayForm: FormGroup = new FormGroup({
    timeOfDay: new FormControl('', [Validators.required, Validators.maxLength(20)])
  });

  constructor(public dialogRef: MatDialogRef<TimeOfDayDialogComponent>) {
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
