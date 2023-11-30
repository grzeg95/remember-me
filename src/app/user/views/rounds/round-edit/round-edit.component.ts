import {JsonPipe, Location, NgIf} from '@angular/common';
import {Component, effect, OnDestroy, OnInit, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatDialog} from '@angular/material/dialog';
import {MatInputModule} from '@angular/material/input';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';
import {AngularFirebaseFirestoreService} from 'angular-firebase';
import {AuthService, User} from 'auth';
import {catchError, EMPTY, NEVER, Subscription, switchMap, throwError} from 'rxjs';
import {ConnectionService, CustomValidators} from 'services';
import {BasicEncryptedValue} from 'utils';
import {RouterDict} from '../../../../app.constants';
import {HTTPError} from '../models';
import {RoundsService} from '../rounds.service';
import {decryptRound} from '../utils';
import {RoundDialogConfirmDeleteComponent} from './round-dialog-confirm-delete/round-dialog-confirm-delete.component';

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
    JsonPipe
  ],
  styleUrl: './round-edit.component.scss'
})
export class RoundEditComponent implements OnInit, OnDestroy {

  isOnline = this.connectionService.isOnline;
  isLoading = signal<boolean>(true);
  editedRound = this.roundsService.editedRound;
  initValues = {name: ''};
  isNothingChanged = signal(true);

  roundForm: FormGroup = new FormGroup({
    name: new FormControl('', [CustomValidators.maxRequired(256)])
  });

  name = this.roundForm.get('name');
  editedRoundOnSnapSub!: Subscription;

  constructor(
    private activeRoute: ActivatedRoute,
    private roundsService: RoundsService,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
    public dialog: MatDialog,
    public location: Location,
    private connectionService: ConnectionService,
    private angularFirebaseFirestoreService: AngularFirebaseFirestoreService,
    private authService: AuthService
  ) {
    this.roundForm.enable();

    effect(() => {
      if (this.isOnline()) {
        this.setGettingOfRoundById(this.activeRoute.snapshot.params['id'] || 'null');
      } else {
        this.roundForm.disable();
      }
    })
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((paramMap) => {
      this.setGettingOfRoundById(paramMap.get('id') || '');
    });

    this.roundForm.get('name')?.valueChanges.subscribe((val) => {
      this.isNothingChanged.set(this.initValues.name !== val);
    });
  }

  setGettingOfRoundById(id: string) {

    if (this.editedRoundOnSnapSub && !this.editedRoundOnSnapSub.closed) {
      this.editedRoundOnSnapSub.unsubscribe();
    }

    if (!id) {
      this.resetForm();
      this.roundsService.editedRound.set(undefined);
      this.roundForm.enable();
      this.isLoading.set(false);
      return;
    }

    const user = this.authService.user$.value as User;

    return this.angularFirebaseFirestoreService.docOnSnapshot<BasicEncryptedValue>(`users/${user.firebaseUser.uid}/rounds/${id}`).pipe(
      switchMap((docSnap) => {
        if (!docSnap.exists()) {
          throw throwError(() => {
          });
        }

        return decryptRound(docSnap.data(), user!.cryptoKey).then((round) => {
          round.id = docSnap.id;
          return round;
        });
      }),
      catchError(() => {
        this.setGettingOfRoundById('');
        return EMPTY;
      })
    ).subscribe((round) => {

      this.isLoading.set(false);

      this.roundsService.editedRound.set(round);

      this.roundForm.get('name')?.setValue(round.name);
      this.initValues = {
        name: round.name
      };
      this.roundForm.enable();
    });
  }

  saveRound(): void {

    this.isLoading.set(true);
    this.roundForm.disable();

    this.roundsService.saveRound(this.name?.value, this.editedRound()?.id).pipe(
      catchError((error: HTTPError) => {
        this.isLoading.set(false);
        this.roundForm.enable();
        this.snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
        return NEVER;
      })
    ).subscribe((success) => {

      this.snackBar.open(success.details || 'Your operation has been done 😉');

      if (success.created) {
        this.router.navigate(['/', RouterDict.user, RouterDict.rounds, RouterDict.roundEditor, success.roundId]).toString();
      }
    });
  }

  deleteRound(): void {
    const dialogRef = this.dialog.open(RoundDialogConfirmDeleteComponent);

    dialogRef.afterClosed().subscribe((isConfirmed) => {

      if (isConfirmed) {
        this.roundForm.disable();
        this.isLoading.set(true);

        this.roundsService.deleteRound(this.editedRound()?.id as string).pipe(catchError((error: HTTPError) => {
          this.isLoading.set(false);
          this.roundForm.enable();
          this.snackBar.open(error.details || 'Some went wrong 🤫 Try again 🙂');
          return NEVER;
        })).subscribe((success) => {
          this.snackBar.open(success.details || 'Your operation has been done 😉');
          this.setGettingOfRoundById('');
        });
      }
    });
  }

  resetForm(): void {
    this.roundForm.reset({name: ''});
    this.initValues = {name: ''};
  }

  ngOnDestroy(): void {
    this.roundsService.editedRound.set(undefined);

    if (this.editedRoundOnSnapSub && !this.editedRoundOnSnapSub.closed) {
      this.editedRoundOnSnapSub.unsubscribe();
    }
  }
}
