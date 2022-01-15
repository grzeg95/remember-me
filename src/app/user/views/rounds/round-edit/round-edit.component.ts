import {Component, NgZone, OnDestroy, OnInit} from '@angular/core';
import {AngularFireFunctions} from '@angular/fire/compat/functions';
import {AbstractControl, FormControl, FormGroup, Validators} from '@angular/forms';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';
import {Observable, Subscription} from 'rxjs';
import {finalize} from 'rxjs/operators';
import {AppService} from '../../../../app-service';
import {RouterDict} from '../../../../app.constants';
import {HTTPError, HTTPSuccess} from '../../../models';
import {RoundsService} from '../rounds.service';
import {RoundDialogConfirmDeleteComponent} from './round-dialog-confirm-delete/round-dialog-confirm-delete.component';
import {Location} from '@angular/common';

@Component({
  selector: 'app-times-of-day-list',
  templateUrl: './round-edit.component.html',
  styleUrls: ['./round-edit.component.scss']
})
export class RoundEditComponent implements OnInit, OnDestroy {

  get isOnline$(): Observable<boolean> {
    return this.appService.isOnline$;
  }

  get name(): AbstractControl {
    return this.roundForm.get('name');
  }

  roundForm: FormGroup = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.max(256)])
  });

  savingInProgress = false;
  deletingInProgress = false;
  saveRoundSub: Subscription;
  deleteRoundSub: Subscription;
  getRoundByIdSub: Subscription;
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
    protected appService: AppService,
    private router: Router,
    private route: ActivatedRoute,
    private fns: AngularFireFunctions,
    public dialog: MatDialog,
    public location: Location
  ) {
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((paramMap) => {
      if (paramMap.get('id')) {
        this.refreshRoundByParamId(paramMap.get('id'));
      }
    });

    this.roundsService.inEditMode = true;
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

    if (this.saveRoundSub && !this.saveRoundSub.closed) {
      this.saveRoundSub.unsubscribe();
    }

    this.saveRoundSub = this.roundsService.saveRound(this.name.value, this.id).pipe(
      finalize(() => this.savingInProgress = false)
    ).subscribe((success) => {
      this.zone.run(() => {
        if (success.created) {
          this.location.go(this.router.createUrlTree(['/', RouterDict.user, RouterDict.rounds, RouterDict.roundEditor, success.roundId]).toString());
        }

        this.name.setValue(this.name.value.trim());
        this.roundsService.editedRound$.next({taskSize: 0, timesOfDay: [], name: this.name.value, id: success.roundId});
        this.id = success.roundId;
        this.savingInProgress = false;
        this.initValues.name = this.name.value;
        this.roundForm.enable();

        this.snackBar.open(success.details || 'Your operation has been done 😉');
      });
    }, (error) => {
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

        if (this.deleteRoundSub && !this.deleteRoundSub.closed) {
          this.deleteRoundSub.unsubscribe();
        }

        this.deleteRoundSub = this.fns.httpsCallable('deleteRound')(this.id).subscribe((success: HTTPSuccess) => {
          this.zone.run(() => {
            this.snackBar.open(success.details || 'Your operation has been done 😉');
            this.deepResetForm();
            this.deletingInProgress = false;
          });
        }, (error: HTTPError) => {
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

      if (this.getRoundByIdSub && !this.getRoundByIdSub.closed) {
        this.getRoundByIdSub.unsubscribe();
      }

      this.getRoundByIdSub = this.roundsService.getRoundById$(roundId).subscribe((round) => {
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

    if (this.saveRoundSub && !this.saveRoundSub.closed) {
      this.saveRoundSub.unsubscribe();
    }

    if (this.deleteRoundSub && !this.deleteRoundSub.closed) {
      this.deleteRoundSub.unsubscribe();
    }

    if (this.getRoundByIdSub && !this.getRoundByIdSub.closed) {
      this.getRoundByIdSub.unsubscribe();
    }

    this.roundsService.inEditMode = false;
    this.roundsService.editedRound$.next(null);
  }
}
