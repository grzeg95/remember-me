import {Location} from '@angular/common';
import {ChangeDetectionStrategy, Component, OnDestroy, OnInit, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup} from '@angular/forms';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';
import {catchError, NEVER} from 'rxjs';
import {ConnectionService, CustomValidators} from 'services';
import {RouterDict} from '../../../../app.constants';
import {HTTPError} from '../../../models';
import {RoundsService} from '../rounds.service';
import {RoundDialogConfirmDeleteComponent} from './round-dialog-confirm-delete/round-dialog-confirm-delete.component';

@Component({
  selector: 'app-times-of-day-list',
  templateUrl: './round-edit.component.html',
  styleUrls: ['./round-edit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoundEditComponent implements OnInit, OnDestroy {

  isOnline = toSignal(this.connectionService.isOnline$);

  roundForm: FormGroup = new FormGroup({
    name: new FormControl('', [CustomValidators.maxRequired(256)])
  });

  name = this.roundForm.get('name');

  savingInProgress = signal(false);
  deletingInProgress = signal(false);
  id= 'null';
  initValues: {
    name: string
  } = {
    name: ''
  };

  constructor(
    private roundsService: RoundsService,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
    public dialog: MatDialog,
    public location: Location,
    private connectionService: ConnectionService
  ) {
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((paramMap) => {
      if (paramMap.get('id')) {
        this.refreshRoundByParamId(paramMap.get('id'));
      }
    });
  }

  idIsNull(): boolean {
    return this.id === 'null';
  }

  saveRound(): void {

    if (this.roundForm.disabled || !this.roundForm.valid || this.nothingChanged() || this.savingInProgress) {
      return;
    }

    this.savingInProgress.set(true);
    this.roundForm.disable();

    this.roundsService.saveRound(this.name.value, this.id).pipe(catchError((error: HTTPError) => {
      this.savingInProgress.set(false);
      this.snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
      this.refreshRoundByParamId(this.id);

      return NEVER;
    })).subscribe((success) => {

      if (success.created) {
        this.location.go(this.router.createUrlTree(['/', RouterDict.user, RouterDict.rounds, RouterDict.roundEditor, success.roundId]).toString());
      }

      this.name.setValue(this.name.value.trim());
      this.roundsService.editedRound$.next({
        timesOfDayCardinality: [],
        timesOfDay: [],
        name: this.name.value,
        id: success.roundId,
        todaysIds: [],
        tasksIds: []
      });
      this.id = success.roundId;
      this.savingInProgress.set(false);
      this.initValues.name = this.name.value;
      this.roundForm.enable();
      this.snackBar.open(success.details || 'Your operation has been done 😉');

    });
  }

  deleteRound(): void {
    const dialogRef = this.dialog.open(RoundDialogConfirmDeleteComponent);

    dialogRef.afterClosed().subscribe((isConfirmed) => {

      if (isConfirmed) {
        this.roundForm.disable();
        this.deletingInProgress.set(true);

        this.roundsService.deleteRound(this.id).pipe(catchError((error: HTTPError) => {
          this.deletingInProgress.set(false);
          this.snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
          this.refreshRoundByParamId(this.id);

          return NEVER;
        })).subscribe((success) => {
          this.deletingInProgress.set(false);
          this.snackBar.open(success.details || 'Your operation has been done 😉');
          this.deepResetForm();
        });
      }
    });
  }

  restartForm(): void {
    this.roundForm.reset({
      name: ''
    });
    this.initValues.name = '';
  }

  deepResetForm(): void {
    this.roundForm.disable();
    this.id = 'null'
    this.restartForm();
    this.location.go(this.router.createUrlTree(['/', RouterDict.user, RouterDict.rounds, RouterDict.roundEditor]).toString());
    this.roundForm.enable();
    this.roundsService.editedRound$.next(null);
  }

  nothingChanged(): boolean {
    return this.initValues.name === this.roundForm.getRawValue().name;
  }

  refreshRoundByParamId(roundId: string) {

    this.roundForm.disable();

    if (roundId !== 'null') {

      this.id = roundId;

      this.roundsService.getRoundById(roundId).subscribe((round) => {
        if (round) {
          this.roundForm.get('name').setValue(round.name);
          this.initValues.name = round.name;
          this.id = roundId;
          this.roundForm.enable();
          this.roundsService.editedRound$.next({...round, id: roundId});
        } else {
          this.deepResetForm();
        }
      });
    } else {
      this.roundForm.enable();
      this.roundsService.editedRound$.next(null);
    }

  }

  ngOnDestroy(): void {
    this.roundsService.editedRound$.next(null);
  }
}
