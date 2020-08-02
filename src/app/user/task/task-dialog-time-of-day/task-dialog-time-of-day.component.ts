import {Component, HostListener, Input, OnDestroy, OnInit, ViewEncapsulation} from '@angular/core';
import {FormControl, FormGroup} from '@angular/forms';
import {MatDialogRef} from '@angular/material/dialog';
import {Observable, Subscription} from 'rxjs';
import {map, startWith} from 'rxjs/operators';
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
  taskTimesOfDay: string[] = [];
  timeOfDayForm: FormGroup = new FormGroup({
    timeOfDay: new FormControl('', [
      TaskDialogTimeOfDay.timeOfDayValidatorLength,
      TaskDialogTimeOfDay.timeOfDayValidatorSlash]
    )
  });
  filteredOptions: Observable<string[]>;
  timesOfDayOrderSub: Subscription;

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Enter' && this.timeOfDayForm.get('timeOfDay').valid) {
      this.addTimeOfDay();
    }
  }

  constructor(
    public dialogRef: MatDialogRef<TaskDialogTimeOfDay>,
    private userService: UserService) {}

  ngOnInit(): void {
    this.filteredOptions = this.timeOfDayForm.get('timeOfDay').valueChanges
      .pipe(
        startWith(''),
        map((value) => this._filter(value))
      );

    this.timesOfDayOrderSub = this.userService.timesOfDayOrder$.subscribe((timesOfDayOrderNext) => {
      const timesOfDayOrderSet = timesOfDayOrderNext.map((val) => val.id).toSet().difference(this.taskTimesOfDay.toSet());
      const timesOfDayOrder = [];

      for (const x of timesOfDayOrderNext) {
        if (timesOfDayOrderSet.has(x.id)) {
          timesOfDayOrder.push(x.id);
          timesOfDayOrderSet.delete(x.id);
        }
      }

      this.taskTimesOfDay = timesOfDayOrder;
    });

  }

  ngOnDestroy(): void {
    this.timesOfDayOrderSub.unsubscribe();
  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();

    return this.taskTimesOfDay.filter((option) => option.toLowerCase().includes(filterValue));
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
