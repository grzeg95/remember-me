import { Component, OnDestroy, OnInit } from '@angular/core';
import { asapScheduler, Subscription } from 'rxjs';
import { skip } from 'rxjs/operators';
import { RouterDict } from '../../../app.constants';
import { Round } from '../../models';
import { RoundService } from './round/round.service';
import { RoundsService } from './rounds.service';

@Component({
  selector: 'times-of-day',
  templateUrl: './rounds.component.html',
  styleUrls: ['./rounds.component.scss']
})
export class RoundsComponent implements OnInit, OnDestroy {

  editedRound$ = this.roundsService.editedRound$;
  roundSelectedSub: Subscription;
  asapSchedulerForRoundSelectedSub: Subscription;
  roundSelected: Round;
  RouterDict = RouterDict;

  constructor(
    private roundsService: RoundsService,
    private roundService: RoundService
  ) {
  }

  ngOnInit(): void {
    this.roundsService.init();
    this.roundService.init();

    this.roundSelectedSub = this.roundsService.roundSelected$
      .pipe(skip(1))
      .subscribe((roundSelected) => {
        this.asapSchedulerForRoundSelectedSub = asapScheduler.schedule(() => {
          this.roundSelected = roundSelected;
        })
      });
  }

  ngOnDestroy(): void {
    this.roundsService.clearCache();
    this.roundService.clearCache();

    this.roundSelectedSub.unsubscribe();

    if (this.asapSchedulerForRoundSelectedSub && !this.asapSchedulerForRoundSelectedSub.closed) {
      this.asapSchedulerForRoundSelectedSub.unsubscribe();
    }
  }
}
