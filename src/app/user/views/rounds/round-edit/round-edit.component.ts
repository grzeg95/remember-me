import {Component, NgZone, OnDestroy, OnInit} from '@angular/core';
import {FormControl, FormGroup} from '@angular/forms';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';
import {Subscription} from 'rxjs';
import {RouterDict} from '../../../../app.constants';
import {ConnectionService} from "../../../../connection.service";
import {CustomValidators} from '../../../../custom-validators';
import {HTTPError} from '../../../models';
import {RoundsService} from '../rounds.service';
import {RoundDialogConfirmDeleteComponent} from './round-dialog-confirm-delete/round-dialog-confirm-delete.component';
import {Location} from '@angular/common';

@Component({
  selector: 'app-times-of-day-list',
  templateUrl: './round-edit.component.html',
  styleUrls: ['./round-edit.component.scss']
})
export class RoundEditComponent implements OnInit, OnDestroy {

  isOnline: boolean;
  isOnlineSub: Subscription;

  roundForm: FormGroup = new FormGroup({
    name: new FormControl('', [CustomValidators.maxRequired(256)])
  });

  name = this.roundForm.get('name');

  savingInProgress = false;
  deletingInProgress = false;
  id = 'null';
  initValues: {
    name: string
  } = {
    name: ''
  };

  constructor(
    protected roundsService: RoundsService,
    protected snackBar: MatSnackBar,
    protected zone: NgZone,
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

    this.roundsService.inEditMode = true;

    this.isOnlineSub = this.connectionService.isOnline$.subscribe((isOnline) => this.isOnline = isOnline);
  }

  idIsNull(): boolean {
    return this.id === 'null';
  }

  saveRound(): void {

    if (this.roundForm.disabled || !this.roundForm.valid || this.nothingChanged() || this.savingInProgress) {
      return;
    }

    this.savingInProgress = true;
    this.roundForm.disable();

    this.roundsService.saveRound(this.name.value, this.id).then((success) => {
      this.zone.run(() => {
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
        this.savingInProgress = false;
        this.initValues.name = this.name.value;
        this.roundForm.enable();

        this.snackBar.open(success.details || 'Your operation has been done 😉');
      });
    }).catch((error) => {
      this.zone.run(() => {
        this.snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
        this.refreshRoundByParamId(this.id);
      });
    });
  }

  deleteRound(): void {
    const dialogRef = this.dialog.open(RoundDialogConfirmDeleteComponent);

    dialogRef.afterClosed().subscribe((isConfirmed) => {

      if (isConfirmed) {
        this.roundForm.disable();
        this.deletingInProgress = true;

        this.roundsService.deleteRound(this.id).then((success) => {
          this.zone.run(() => {
            this.snackBar.open(success.details || 'Your operation has been done 😉');
            this.deepResetForm();
            this.deletingInProgress = false;
          });
        }).catch((error: HTTPError) => {
          this.zone.run(() => {
            this.snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
            this.refreshRoundByParamId(this.id);
          });
        });
      }

    });
  }

  resetId(): void {
    this.id = 'null';
  }

  restartForm(): void {
    this.roundForm.reset({
      name: ''
    });
    this.initValues.name = '';
  }

  deepResetForm(): void {
    this.roundForm.disable();
    this.resetId();
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

      this.roundsService.getRoundById$(roundId).then((round) => {
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
    this.roundsService.inEditMode = false;
    this.roundsService.editedRound$.next(null);
    this.isOnlineSub.unsubscribe();
  }
}
