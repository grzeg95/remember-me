import {AsyncPipe} from '@angular/common';
import {Component, DestroyRef, Inject, OnDestroy} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatDialog} from '@angular/material/dialog';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';
import {Firestore} from 'firebase/firestore';
import {BehaviorSubject, catchError, combineLatest, NEVER, of, Subscription, switchMap} from 'rxjs';
import {fadeZoomInOutTrigger} from '../../animations/fade-zoom-in-out.trigger';
import {RouterDict} from '../../app.constants';
import {FirestoreInjectionToken} from '../../models/firebase';
import {Round, RoundDoc} from '../../models/round';
import {User} from '../../models/user';
import {AuthService} from '../../services/auth.service';
import {ConnectionService} from '../../services/connection.service';
import {CustomValidators} from '../../services/custom-validators';
import {docSnapshots} from '../../services/firebase/firestore';
import {RoundsService} from '../../services/rounds.service';
import {RoundDialogConfirmDeleteComponent} from '../round-dialog-confirm-delete/round-dialog-confirm-delete.component';
import {ErrorDirective, InputDirective, LabelDirective} from '../ui/form-field/directives';
import {FormFieldComponent} from '../ui/form-field/form-field.component';

@Component({
  selector: 'app-times-of-day-list',
  standalone: true,
  templateUrl: './round-edit.component.html',
  imports: [
    ReactiveFormsModule,
    MatProgressBarModule,
    MatButtonModule,
    FormFieldComponent,
    LabelDirective,
    InputDirective,
    ErrorDirective,
    AsyncPipe
  ],
  styleUrl: './round-edit.component.scss',
  animations: [
    fadeZoomInOutTrigger
  ]
})
export class RoundEditComponent implements OnDestroy {

  protected readonly _user$ = this._authService.user$;
  protected readonly _cryptoKey$ = this._authService.cryptoKey$;

  protected readonly _isOnline$ = this._connectionService.isOnline$;

  protected readonly _isLoading$ = new BehaviorSubject<boolean>(false);

  protected readonly _editRoundId$ = this._roundsService.editRoundId$;
  protected readonly _editRound$ = this._roundsService.editRound$;

  protected _initValues = {name: ''};

  protected readonly _isNothingChanged$ = new BehaviorSubject<boolean>(true);

  protected readonly _roundForm: FormGroup = new FormGroup({
    name: new FormControl('', [CustomValidators.maxRequired(256)])
  });

  protected readonly _name = this._roundForm.get('name');
  private _editRoundSub: Subscription | undefined;

  constructor(
    private readonly _activeRoute: ActivatedRoute,
    private readonly _roundsService: RoundsService,
    private readonly _snackBar: MatSnackBar,
    private readonly _router: Router,
    private readonly _route: ActivatedRoute,
    protected readonly _dialog: MatDialog,
    private readonly _connectionService: ConnectionService,
    @Inject(FirestoreInjectionToken) private readonly _firestore: Firestore,
    private readonly _authService: AuthService,
    private readonly _destroyRef: DestroyRef
  ) {
    this._roundForm.enable();

    combineLatest([
      this._isOnline$
    ]).pipe(
      takeUntilDestroyed(this._destroyRef)
    ).subscribe(([isOnline]) => {
      if (isOnline) {
        this._roundsService.editRoundId$.next(this._activeRoute.snapshot.params['id'] || undefined);
      } else {
        this._roundForm.disable();
      }
    });

    this._route.paramMap.subscribe((paramMap) => {
      this._roundsService.editRoundId$.next(paramMap.get('id'));
    });

    this._name?.valueChanges.subscribe((val) => {
      this._isNothingChanged$.next(this._initValues.name !== val);
    });

    // editRound
    let editRound_userId: string | undefined;
    let editRound_editRoundId: string | undefined;

    combineLatest([
      this._user$,
      this._cryptoKey$,
      this._editRoundId$
    ]).pipe(
      takeUntilDestroyed(this._destroyRef)
    ).subscribe(([user, cryptoKey, editRoundId]) => {

      if (user === undefined || editRoundId === undefined || !cryptoKey) {
        return;
      }

      if (!user || !editRoundId) {
        this.resetForm();
        this._router.navigate(['/', RouterDict.user, RouterDict.rounds, RouterDict.roundEditor]);
        this._roundsService.round$.next(undefined);
        this._roundsService.roundId$.next(undefined);
        this._roundForm.enable();
        editRound_userId = undefined;
        editRound_editRoundId = undefined;
        this._editRoundSub && !this._editRoundSub.closed && this._editRoundSub.unsubscribe();
        return;
      }

      if (
        editRound_userId === user.id &&
        editRound_editRoundId === editRoundId
      ) {
        return;
      }

      editRound_userId = user.id;
      editRound_editRoundId = editRoundId;

      const userRef = User.ref(this._firestore, user.id);
      const roundRef = Round.ref(userRef, editRoundId);

      this._roundsService.loadingEditRound$.next(true);
      this._editRoundSub && !this._editRoundSub.closed && this._editRoundSub.unsubscribe();
      this._editRoundSub = docSnapshots<Round, RoundDoc>(roundRef).pipe(
        takeUntilDestroyed(this._destroyRef),
        switchMap((docSnap) => Round.data(docSnap, cryptoKey)),
        catchError(() => of(null))
      ).subscribe((round) => {

        this._roundsService.loadingEditRound$.next(false);

        if (!round) {
          this._roundsService.roundId$.next(undefined);
          return;
        }

        this._isLoading$.next(false);

        this._roundsService.editRound$.next(round);

        this._roundForm.get('name')?.setValue(round.name);
        this._initValues = {
          name: round.name
        };
        this._roundForm.enable();
      });
    });
  }

  saveRound(): void {

    this._isLoading$.next(true);
    this._roundForm.disable();

    this._roundsService.saveRound(this._name?.value, this._editRound$.value?.id).pipe(
      catchError((error) => {
        this._isLoading$.next(false);
        this._roundForm.enable();
        this._snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
        return NEVER;
      })
    ).subscribe((success) => {

      this._snackBar.open(success.details || 'Your operation has been done 😉');

      if (success.created) {
        this._router.navigate(['/', RouterDict.user, RouterDict.rounds, RouterDict.roundEditor, success.roundId]).toString();
      }
    });
  }

  deleteRound(): void {

    const dialogRef = this._dialog.open(RoundDialogConfirmDeleteComponent);

    dialogRef.afterClosed().subscribe((isConfirmed) => {

      if (isConfirmed) {
        this._roundForm.disable();
        this._isLoading$.next(true);

        this._roundsService.deleteRound(this._editRound$.value?.id as string).pipe(
          catchError((error) => {
            this._isLoading$.next(false);
            this._roundForm.enable();
            this._snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
            return NEVER;
          })
        ).subscribe((success) => {
          this._snackBar.open(success.details || 'Your operation has been done 😉');
          this._roundsService.editRoundId$.next(undefined);
        });
      }
    });
  }

  resetForm(): void {
    this._roundForm.reset({name: ''});
    this._initValues = {name: ''};
  }

  ngOnDestroy(): void {
    this._roundsService.editRoundId$.next(undefined);
    this._roundsService.editRound$.next(undefined);
    this._roundsService.loadingEditRound$.next(false);
  }
}
