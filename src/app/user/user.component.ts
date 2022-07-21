import {Component, OnDestroy, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import { Subscription } from "rxjs";
import {RouterDict} from '../app.constants';
import { AuthService } from "../auth/auth.service";
import {RoundService} from './views/rounds/round/round.service';
import {RoundsService} from './views/rounds/rounds.service';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss']
})
export class UserComponent implements OnInit, OnDestroy {

  isUserDecrypted: boolean;
  isUserDecryptedSub: Subscription;

  get isNudeUser(): boolean {
    return this.router.isActive('/' + RouterDict.user, true);
  }

  constructor(
    private roundService: RoundService,
    private roundsService: RoundsService,
    private router: Router,
    private authService: AuthService
  ) {
  }

  ngOnInit(): void {
    this.isUserDecryptedSub = this.authService.isUserDecrypted$.subscribe((isUserDecrypted) => {
      this.isUserDecrypted = isUserDecrypted;
      if (isUserDecrypted) {
        this.roundsService.init();
        this.roundService.init();
      }
    });
  }

  ngOnDestroy(): void {
    this.isUserDecryptedSub.unsubscribe();
    this.roundsService.clearCache();
    this.roundService.clearCache();
  }
}
