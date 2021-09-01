import {DragDropModule} from '@angular/cdk/drag-drop';
import {NgModule} from '@angular/core';
import {AngularFireAuthModule} from '@angular/fire/compat/auth';
import {AngularFirestoreModule} from '@angular/fire/compat/firestore';
import {AngularFireFunctionsModule} from '@angular/fire/compat/functions';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatChipsModule} from '@angular/material/chips';
import {MatIconModule} from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatTableModule} from '@angular/material/table';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {MatButtonModule} from '@angular/material/button';
import {MatDialogModule} from '@angular/material/dialog';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {OverlayModule} from '@angular/cdk/overlay';
import {MatToolbarModule} from '@angular/material/toolbar';
import {LoadingTextComponent} from './loading-text/loading-text.component';
import {CommonModule} from '@angular/common';

const MODULES = [
  AngularFireAuthModule,
  AngularFireFunctionsModule,
  AngularFirestoreModule,
  FontAwesomeModule,
  FormsModule,
  MatButtonModule,
  MatDialogModule,
  MatFormFieldModule,
  MatInputModule,
  MatProgressBarModule,
  MatProgressSpinnerModule,
  MatSlideToggleModule,
  MatSnackBarModule,
  OverlayModule,
  ReactiveFormsModule,
  MatTableModule,
  DragDropModule,
  MatAutocompleteModule,
  MatChipsModule,
  MatToolbarModule,
  MatIconModule,
  MatMenuModule
];

@NgModule({
  imports: [
    MODULES,
    CommonModule
  ],
  exports: [
    ...MODULES,
    LoadingTextComponent
  ],
  declarations: [LoadingTextComponent]
})
export class SharedModule {
}
