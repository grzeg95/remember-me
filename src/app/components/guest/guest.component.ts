import {Component, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {Auth} from '../../services/auth';
import {Theme} from '../../services/theme';

@Component({
  selector: 'app-guest',
  standalone: true,
  templateUrl: './guest.component.html',
  imports: [],
  styleUrls: ['./guest.component.scss']
})
export class GuestComponent {

  private readonly _auth = inject(Auth);
  protected readonly _authUser$ = this._auth.authUser$;
  private readonly _theme = inject(Theme);
  protected readonly _isDarkMode = toSignal(this._theme.isDarkMode$);

}
