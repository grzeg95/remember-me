import {Component, OnDestroy, OnInit} from '@angular/core';
import {asapScheduler, BehaviorSubject, Subscription} from 'rxjs';
import {skip} from 'rxjs/operators';
import {RouterDict} from '../../../app.constants';
import {Round} from '../../models';
import {RoundsService} from './rounds.service';

@Component({
  selector: 'times-of-day',
  templateUrl: './rounds.component.html',
  styleUrls: ['./rounds.component.scss']
})
export class RoundsComponent implements OnInit, OnDestroy {

  get editedRound$(): BehaviorSubject<Round> {
    return this.roundsService.editedRound$;
  }

  roundSelectedSub: Subscription;
  asapSchedulerForRoundSelected: Subscription;
  roundSelected: Round;
  RouterDict = RouterDict;

  constructor(
    private roundsService: RoundsService
  ) {}

  ngOnInit(): void {

    this.roundSelectedSub = this.roundsService.roundSelected$.pipe(skip(1)).subscribe((roundSelected) => {
      this.asapSchedulerForRoundSelected = asapScheduler.schedule(() => {
        this.roundSelected = roundSelected;
      });
    });
  }

  ngOnDestroy(): void {
    this.roundSelectedSub.unsubscribe();

    if (this.asapSchedulerForRoundSelected && !this.asapSchedulerForRoundSelected.closed) {
      this.asapSchedulerForRoundSelected.unsubscribe();
    }
  }
}
