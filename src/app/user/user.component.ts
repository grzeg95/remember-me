import {Component, OnDestroy, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {RouterDict} from '../app.constants';
import {RoundService} from './views/rounds/round/round.service';
import {RoundsService} from './views/rounds/rounds.service';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss']
})
export class UserComponent implements OnInit, OnDestroy {

  get isNudeUser(): boolean {
    return this.router.isActive('/' + RouterDict.user, true);
  }

  constructor(
    private roundService: RoundService,
    private roundsService: RoundsService,
    private router: Router
  ) {
  }

  ngOnInit(): void {
    this.roundsService.init();
    this.roundService.init();
  }

  ngOnDestroy(): void {
    this.roundsService.clearCache();
    this.roundService.clearCache();
  }
}
