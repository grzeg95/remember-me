import {Component, HostListener, Input, OnDestroy, OnInit, ViewEncapsulation} from '@angular/core';
import {FormControl, FormGroup} from '@angular/forms';
import {MatDialogRef} from '@angular/material/dialog';
import {BehaviorSubject, Subscription} from 'rxjs';
import '../../../../../global.prototype';
import {UserService} from '../../user.service';

@Component({
  selector: 'app-task-dialog-time-of-day',
  templateUrl: 'task-dialog-time-of-day.component.html',
  styleUrls: ['task-dialog-time-of-day.component.sass'],
  encapsulation: ViewEncapsulation.None
})
export class TaskDialogTimeOfDay implements OnInit, OnDestroy {

  @Input()
  selectedTimesOfDay: string[] = [];
  timeOfDayForm: FormGroup = new FormGroup({
    timeOfDay: new FormControl('', [
      TaskDialogTimeOfDay.timeOfDayValidatorLength]
    )
  });
  options: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
  timesOfDayOrderSub: Subscription;

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Enter' && this.timeOfDayForm.get('timeOfDay').valid) {
      this.addTimeOfDay();
    }
  }

  constructor(public dialogRef: MatDialogRef<TaskDialogTimeOfDay>,
              private userService: UserService) {
  }

  ngOnInit(): void {

    this.timesOfDayOrderSub = this.userService.timesOfDayOrder$.subscribe((timesOfDayOrderNext) => {
      const timesOfDayOrderSet = timesOfDayOrderNext.map((val) => val.id).toSet().difference(this.selectedTimesOfDay.toSet());
      const timesOfDayOrder = [];

      for (const x of timesOfDayOrderNext) {
        if (timesOfDayOrderSet.has(x.id)) {
          timesOfDayOrder.push(x.id.decodeFirebaseCharacters());
          timesOfDayOrderSet.delete(x.id);
        }
      }

      this.options.next(timesOfDayOrder);

    });

  }

  ngOnDestroy(): void {
    this.timesOfDayOrderSub.unsubscribe();
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

}
