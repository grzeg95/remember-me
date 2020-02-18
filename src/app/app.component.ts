import {AfterViewChecked, ChangeDetectorRef, Component} from '@angular/core';
import {environment} from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  host: { class: 'app' }
})
export class AppComponent implements AfterViewChecked {

  constructor(private cdRef: ChangeDetectorRef) {
    if (environment.production) {
      console.log = () => {};
    }
  }

  ngAfterViewChecked(): void {
    this.cdRef.detectChanges();
  }

}
