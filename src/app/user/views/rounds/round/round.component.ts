import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Observable} from 'rxjs';
import {AuthService} from '../../../../auth/auth.service';
import {RoundsService} from '../rounds.service';

@Component({
  selector: 'app-times-of-day-item',
  templateUrl: './round.component.html'
})
export class RoundComponent implements OnInit {

  get userIsReady$(): Observable<boolean> {
    return this.authService.userIsReady$;
  }

  constructor(
      private route: ActivatedRoute,
      private roundsService: RoundsService,
      private authService: AuthService
  ) {
  }

  ngOnInit(): void {

    this.route.paramMap.subscribe((paramMap) => {
      if (paramMap.get('id')) {
        this.roundsService.paramRoundIdSelected$.next(paramMap.get('id'));
      }
    });
  }
}
