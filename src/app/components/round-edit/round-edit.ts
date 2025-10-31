import {Dialog} from '@angular/cdk/dialog';
import {Component, DestroyRef, effect, inject, OnDestroy, signal} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {catchError, map, NEVER, of, Subscription, takeWhile} from 'rxjs';
import {getRoundRef} from '../../models/firestore/Round';
import {getFirestoreUserRef} from '../../models/firestore/User';
import {RouterDict} from '../../models/router-dict';
import {Auth} from '../../services/auth';
import {Connection} from '../../services/connection';
import {Rounds} from '../../services/rounds';
import {FirestoreInjectionToken} from '../../tokens/firebase';
import {Button} from '../../ui/button/button';
import {Error} from '../../ui/form/error/error';
import {FormField} from '../../ui/form/form-field/form-field';
import {Input} from '../../ui/form/input';
import {Label} from '../../ui/form/label/label';
import {ProgressBarIndeterminate} from '../../ui/progress-bar-indeterminate/progress-bar-indeterminate';
import {SnackBar} from '../../ui/snack-bar/snack-bar';
import {docSnapshots} from '../../utils/firestore';
import {RoundDialogConfirmDelete} from '../dialog/round-dialog-confirm-delete/round-dialog-confirm-delete';

@Component({
  selector: 'app-round-edit',
  standalone: true,
  templateUrl: './round-edit.html',
  imports: [
    ReactiveFormsModule,
    FormField,
    Label,
    Error,
    Input,
    Button,
    ProgressBarIndeterminate
  ],
  styleUrl: './round-edit.scss'
})
export class RoundEdit implements OnDestroy {

  protected readonly _dialog = inject(Dialog);
  private readonly _activeRoute = inject(ActivatedRoute);
  private readonly _rounds = inject(Rounds);
  private readonly _snackBar = inject(SnackBar);
  private readonly _router = inject(Router);
  private readonly _route = inject(ActivatedRoute);
  private readonly _connection = inject(Connection);
  private readonly _firestore = inject(FirestoreInjectionToken);
  private readonly _auth = inject(Auth);
  private readonly _destroyRef = inject(DestroyRef);

  protected readonly _user = toSignal(this._auth.firestoreUser$);

  protected readonly _isOnline = toSignal(this._connection.isOnline$);

  protected readonly _isRoundRequesting = signal(false);

  protected readonly _editingRoundId = toSignal(this._rounds.editingRoundId$);
  protected readonly _editingRound = toSignal(this._rounds.editingRound$);

  protected _initValues = {name: ''};

  protected readonly _wasNothingChanged = signal(true);

  protected readonly _roundForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(64)])
  });

  protected readonly _name = this._roundForm.get('name');
  private _editRoundSub: Subscription | undefined;

  constructor() {

    this._roundForm.disable();

    effect(() => {

      if (this._isOnline()) {
        this._rounds.editingRoundId$.next(this._activeRoute.snapshot.params['id']);
      } else {
        this._roundForm.disable();
      }
    });

    this._route.paramMap.subscribe((paramMap) => {

      const roundId = paramMap.get('id') || undefined;

      this._rounds.editingRoundId$.next(roundId);

      if (!roundId) {
        this._roundForm.enable();
      }
    });

    this._name?.valueChanges.subscribe((val) => {
      this._wasNothingChanged.set(this._initValues.name !== val);
    });

    // editRound
    let editRound_userUId: string | undefined;
    let editRound_editingRoundId: string | undefined;
    effect(() => {

      const user = this._user();
      const editingRoundId = this._editingRoundId();

      if (user === undefined || editingRoundId === undefined) {
        return;
      }

      if (!user || !editingRoundId) {
        this.resetForm();
        this._router.navigate(['/', RouterDict.rounds, RouterDict.roundEditor]);
        this._rounds.editingRound$.next(null);
        this._rounds.editingRoundId$.next(null);
        this._roundForm.enable();
        editRound_userUId = undefined;
        editRound_editingRoundId = undefined;
        this._editRoundSub && !this._editRoundSub.closed && this._editRoundSub.unsubscribe();
        return;
      }

      if (
        editRound_userUId === user.uid &&
        editRound_editingRoundId === editingRoundId
      ) {
        return;
      }

      editRound_userUId = user.uid;
      editRound_editingRoundId = editingRoundId;

      const userRef = getFirestoreUserRef(this._firestore, user.uid);
      const roundRef = getRoundRef(userRef, editingRoundId);

      this._rounds.loadingEditingRound$.next(true);
      this._editRoundSub && !this._editRoundSub.closed && this._editRoundSub.unsubscribe();
      this._editRoundSub = docSnapshots(roundRef).pipe(
        takeUntilDestroyed(this._destroyRef),
        takeWhile(() => !!this._user() || !!this._editingRoundId()),
        map((docSnap) => docSnap.data()),
        catchError(() => of(null))
      ).subscribe((round) => {

        this._rounds.loadingEditingRound$.next(false);

        if (!round) {
          this._rounds.editingRoundId$.next(null);
          return;
        }

        this._rounds.loadingEditingRound$.next(true);

        this._rounds.editingRound$.next(round);

        this._roundForm.get('name')?.setValue(round.name);
        this._initValues = {
          name: round.name
        };
        this._roundForm.enable();
      });

    });
  }

  saveRound() {

    if (this._roundForm.disabled || this._roundForm.invalid || !this._isOnline() || !this._wasNothingChanged()) {
      return;
    }

    if (!this._editingRound()) {
      this.createRound();
    } else {
      this.updateRound();
    }
  }

  createRound(): void {

    this._isRoundRequesting.set(true);
    this._roundForm.disable();

    this._rounds.createRound({round: {name: this._name?.value!}}).pipe(
      catchError((error) => {
        this._isRoundRequesting.set(false);
        this._roundForm.enable();
        this._snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
        return NEVER;
      })
    ).subscribe((success) => {
      this._snackBar.open(success.data.details || 'Your operation has been done 😉');
      this._router.navigate(['/', RouterDict.rounds, RouterDict.roundEditor, success.data.round.id]).toString();
    });
  }

  updateRound(): void {

    this._isRoundRequesting.set(true);
    this._roundForm.disable();

    this._rounds.updateRound({round: {id: this._editingRound()?.id!, name: this._name!.value!}}).pipe(
      catchError((error) => {
        this._snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
        this._isRoundRequesting.set(false);
        this._roundForm.enable();
        return NEVER;
      })
    ).subscribe((success) => {
      this._snackBar.open(success.data.details || 'Your operation has been done 😉');
      this._isRoundRequesting.set(false);
      this._roundForm.enable();
    });
  }

  deleteRound(): void {

    const dialogRef = this._dialog.open(RoundDialogConfirmDelete);

    dialogRef.closed.subscribe((isConfirmed) => {

      if (isConfirmed) {

        this._roundForm.disable();
        this._isRoundRequesting.set(true);

        this._rounds.deleteRound({round: {id: this._editingRound()?.id!}}).pipe(
          catchError((error) => {
            this._isRoundRequesting.set(false);
            this._roundForm.enable();
            this._snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
            return NEVER;
          })
        ).subscribe((success) => {
          this._snackBar.open(success.data.details || 'Your operation has been done 😉');
          this._rounds.editingRoundId$.next(null);
        });
      }
    });
  }

  resetForm(): void {
    this._roundForm.reset({name: ''});
    this._initValues = {name: ''};
  }

  handleNewRound(): void {
    this._rounds.editingRoundId$.next(null);
  }

  ngOnDestroy(): void {
    this._rounds.editingRoundId$.next(undefined);
    this._rounds.editingRound$.next(undefined);
    this._rounds.loadingEditingRound$.next(false);
  }
}
