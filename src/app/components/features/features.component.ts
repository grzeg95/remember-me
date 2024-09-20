import {Component, ViewEncapsulation} from '@angular/core';
import {SvgDirective} from '../../directives/svg.directive';
import {ThemeSelectorService} from '../../services/theme-selector.service';

@Component({
  selector: 'app-features',
  standalone: true,
  imports: [
    SvgDirective
  ],
  templateUrl: './features.component.html',
  styleUrl: './features.component.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'app-features'
  }
})
export class FeaturesComponent {

  protected readonly _darkMode = this._themeSelectorService.darkModeSig.get();

  constructor(
    private readonly _themeSelectorService: ThemeSelectorService
  ) {
  }
}
