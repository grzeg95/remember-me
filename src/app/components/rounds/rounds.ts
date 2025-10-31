import {Component, inject, ViewEncapsulation} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {RouterDict} from '../../models/router-dict';
import {Rounds as RoundsService} from '../../services/rounds';
import {Theme} from '../../services/theme';

@Component({
  selector: 'app-rounds',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './rounds.html',
  styleUrl: './rounds.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'app-rounds'
  }
})
export class Rounds {

  protected readonly _RouterDict = RouterDict;

  private readonly _theme = inject(Theme);
  protected readonly _isDarkMode = toSignal(this._theme.isDarkMode$);

  private readonly _rounds = inject(RoundsService);
  protected readonly _selectedRound = toSignal(this._rounds.selectedRound$);
  protected readonly _editingRound = toSignal(this._rounds.editingRound$);
}
