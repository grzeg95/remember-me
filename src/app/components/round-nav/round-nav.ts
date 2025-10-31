import {Component, inject, OnInit, signal, ViewEncapsulation} from '@angular/core';
import {ActivatedRoute, Router, RouterLink, RouterLinkActive} from '@angular/router';
import {RouterDict} from '../../models/router-dict';

@Component({
  selector: 'app-round-nav',
  standalone: true,
  templateUrl: './round-nav.html',
  imports: [
    RouterLink,
    RouterLinkActive
  ],
  styleUrl: './round-nav.scss',
  host: {
    class: 'app-round-nav'
  },
  encapsulation: ViewEncapsulation.None
})
export class RoundNav implements OnInit {

  private readonly _activatedRoute = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  protected readonly _RouterDict = RouterDict;
  protected readonly _todayTasksViewActive = signal(false);

  ngOnInit() {
    this._activatedRoute.url.subscribe(() => {
      this._todayTasksViewActive.set(this._router.url.indexOf('/' + this._RouterDict.todayTasks) > -1);
    });
  }
}
