import {Component, OnDestroy, OnInit} from '@angular/core';
import {asyncScheduler, Subscription} from 'rxjs';
import {skip} from 'rxjs/operators';
import {RouterDict} from '../../../app.constants';
import {Round} from '../../models';
import {RoundsService} from './rounds.service';

@Component({
  selector: 'app-rounds',
  templateUrl: './rounds.component.html',
  styleUrls: ['./rounds.component.scss']
})
export class RoundsComponent implements OnInit, OnDestroy {

  selectedRoundSub: Subscription;
  selectedRound: Round = null;
  RouterDict = RouterDict;

  editedRound$ = this.roundsService.editedRound$;

  constructor(
    private roundsService: RoundsService
  ) {
  }

  ngOnInit(): void {
    this.roundsService.init();
    this.selectedRoundSub = this.roundsService.selectedRound$
      .pipe(skip(1))
      .subscribe((selectedRound) => {
        asyncScheduler.schedule(() => {
          this.selectedRound = selectedRound;
        });
      });
  }

  ngOnDestroy(): void {
    this.selectedRoundSub.unsubscribe();
    this.roundsService.clearCache();
  }
}
