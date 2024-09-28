import {Dialog} from '@angular/cdk/dialog';
import {NgIf} from '@angular/common';
import {Component, DestroyRef, effect, Inject, OnDestroy} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';
import {Firestore} from 'firebase/firestore';
import {catchError, NEVER, of, Subscription, switchMap, takeWhile} from 'rxjs';
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
import {Sig} from '../../utils/sig';
import {ButtonComponent} from '../button/button.component';
import {InputComponent} from '../input/input.component';
import {RoundDialogConfirmDeleteComponent} from '../round-dialog-confirm-delete/round-dialog-confirm-delete.component';

@Component({
  selector: 'app-times-of-day-list',
  standalone: true,
  templateUrl: './round-edit.component.html',
  imports: [
    ReactiveFormsModule,
    MatProgressBarModule,
    MatInputModule,
    MatButtonModule,
    NgIf,
    InputComponent,
    ButtonComponent
  ],
  styleUrl: './round-edit.component.scss',
  animations: [
    fadeZoomInOutTrigger
  ]
})
export class RoundEditComponent implements OnDestroy {

  protected readonly _user = this._authService.userSig.get();
  protected readonly _cryptoKey = this._authService.cryptoKeySig.get();

  protected readonly _isOnline = this._connectionService.isOnlineSig.get();

  private readonly _isLoadingSig = new Sig<boolean>(false);
  protected readonly _isLoading = this._isLoadingSig.get();

  protected readonly _editedRoundIdSig = this._roundsService.editedRoundIdSig;
  protected readonly _editedRoundId = this._editedRoundIdSig.get();
  protected readonly _editedRound = this._roundsService.editedRoundSig.get();

  protected _initValues = {name: ''};

  private readonly _isNothingChangedSig = new Sig<boolean>(true);
  protected readonly _isNothingChanged = this._isNothingChangedSig.get();

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
    protected readonly _dialog: Dialog,
    private readonly _connectionService: ConnectionService,
    @Inject(FirestoreInjectionToken) private readonly _firestore: Firestore,
    private readonly _authService: AuthService,
    private readonly _destroyRef: DestroyRef
  ) {
    this._roundForm.enable();

    effect(() => {
      if (this._isOnline()) {
        this._roundsService.editedRoundIdSig.set(this._activeRoute.snapshot.params['id'] || undefined);
      } else {
        this._roundForm.disable();
      }
    });

    this._route.paramMap.subscribe((paramMap) => {
      this._roundsService.editedRoundIdSig.set(paramMap.get('id'));
    });

    this._name?.valueChanges.subscribe((val) => {
      this._isNothingChangedSig.set(this._initValues.name !== val);
    });

    // editRound
    let editRound_userId: string | undefined;
    let editRound_editRoundId: string | undefined;
    effect(() => {

      const user = this._user();
      const cryptoKey = this._cryptoKey();
      const editRoundId = this._editedRoundId();

      if (user === undefined || editRoundId === undefined || !cryptoKey) {
        return;
      }

      if (!user || !editRoundId) {
        this.resetForm();
        this._router.navigate(['/', RouterDict.user, RouterDict.rounds, RouterDict.roundEditor]);
        this._roundsService.roundSig.set(undefined);
        this._roundsService.roundIdSig.set(undefined);
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

      this._roundsService.loadingEditRoundSig.set(true);
      this._editRoundSub && !this._editRoundSub.closed && this._editRoundSub.unsubscribe();
      this._editRoundSub = docSnapshots<Round, RoundDoc>(roundRef).pipe(
        takeUntilDestroyed(this._destroyRef),
        takeWhile(() => !!this._user() || !!this._editedRoundId()),
        switchMap((docSnap) => Round.data(docSnap, cryptoKey)),
        catchError(() => of(null))
      ).subscribe((round) => {

        this._roundsService.loadingEditRoundSig.set(false);

        if (!round) {
          this._roundsService.roundIdSig.set(undefined);
          return;
        }

        this._isLoadingSig.set(false);

        this._roundsService.editedRoundSig.set(round);

        this._roundForm.get('name')?.setValue(round.name);
        this._initValues = {
          name: round.name
        };
        this._roundForm.enable();
      });

    });
  }

  saveRound(): void {

    this._isLoadingSig.set(true);
    this._roundForm.disable();

    this._roundsService.saveRound(this._name?.value, this._editedRound()?.id).pipe(
      catchError((error) => {
        this._isLoadingSig.set(false);
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

    dialogRef.closed.subscribe((isConfirmed) => {

      if (isConfirmed) {
        this._roundForm.disable();
        this._isLoadingSig.set(true);

        this._roundsService.deleteRound(this._editedRound()?.id as string).pipe(
          catchError((error) => {
            this._isLoadingSig.set(false);
            this._roundForm.enable();
            this._snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
            return NEVER;
          })
        ).subscribe((success) => {
          this._snackBar.open(success.details || 'Your operation has been done 😉');
          this._roundsService.editedRoundIdSig.set(undefined);
        });
      }
    });
  }

  resetForm(): void {
    this._roundForm.reset({name: ''});
    this._initValues = {name: ''};
  }

  ngOnDestroy(): void {
    this._roundsService.editedRoundIdSig.set(undefined);
    this._roundsService.editedRoundSig.set(undefined);
    this._roundsService.loadingEditRoundSig.set(false);
  }
}
