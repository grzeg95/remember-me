import {Component, HostListener, OnDestroy, OnInit} from '@angular/core';
import {FormControl, FormGroup} from '@angular/forms';
import {MatDialogRef} from '@angular/material/dialog';
import {performance} from 'firebase';

@Component({
  selector: 'app-task-dialog-confirm-delete',
  templateUrl: 'task-dialog-confirm-delete.component.html',
  styleUrls: ['task-dialog-confirm-delete.component.sass'],
})
export class TaskDialogConfirmDeleteComponent implements OnInit, OnDestroy {

  perf = performance();
  taskDialogConfirmDeleteComponentTrace = this.perf.trace('TaskDialogConfirmDeleteComponent');

  constructor(public dialogRef: MatDialogRef<TaskDialogConfirmDeleteComponent>) {}

  ngOnInit(): void {
    this.taskDialogConfirmDeleteComponentTrace.start();
  }

  ngOnDestroy(): void {
    this.taskDialogConfirmDeleteComponentTrace.stop();
  }

  rejectDelete(): void {
    this.dialogRef.close(false);
  }

  confirmDelete(): void {
    this.dialogRef.close(true);
  }

}
