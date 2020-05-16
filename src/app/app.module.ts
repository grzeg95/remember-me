import {OverlayModule} from '@angular/cdk/overlay';
import {HttpClientModule} from '@angular/common/http';
import {NgModule} from '@angular/core';
import {AngularFirePerformanceModule} from '@angular/fire/performance';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatDialogModule} from '@angular/material/dialog';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {AuthCallbackComponent} from './auth/auth-callback.component';
import {CoreModule} from './core.module';
import {GuestComponent} from './guest/guest.component';
import {NavComponent} from './nav/nav.component';
import {SharedModule} from './shared.module';

@NgModule({
  declarations: [
    AppComponent,
    NavComponent,
    GuestComponent,
    AuthCallbackComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    SharedModule,
    CoreModule,
    HttpClientModule,
    MatProgressBarModule,
    OverlayModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    MatSnackBarModule,
    ReactiveFormsModule,
    AngularFirePerformanceModule,
    FontAwesomeModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
