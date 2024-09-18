import {Component, ViewEncapsulation} from '@angular/core';
import {SvgDirective} from '../../directives/svg.directive';
import {ThemeSelectorService} from '../../services/theme-selector.service';

@Component({
  selector: 'app-app-features',
  standalone: true,
  imports: [
    SvgDirective
  ],
  templateUrl: './app-features.component.html',
  styleUrl: './app-features.component.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'app-features'
  }
})
export class AppFeaturesComponent {

  protected readonly _darkMode = this._themeSelectorService.darkModeSig.get();

  constructor(
    private readonly _themeSelectorService: ThemeSelectorService
  ) {
  }
}
