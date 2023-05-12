import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute} from '@angular/router';
import {RoundsService} from '../rounds.service';

@Component({
  selector: 'app-round',
  templateUrl: './round.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoundComponent implements OnInit {

  selectedRound = toSignal(this.roundsService.selectedRound$);

  constructor(
      private route: ActivatedRoute,
      private roundsService: RoundsService
  ) {
  }

  ngOnInit(): void {

    this.route.paramMap.subscribe((paramMap) => {
      if (paramMap.get('id')) {
        this.roundsService.selectRound(paramMap.get('id'));
      }
    });
    this.roundsService.runRoundsList();
  }
}
