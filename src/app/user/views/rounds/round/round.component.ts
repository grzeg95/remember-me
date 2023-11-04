import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {RoundsService} from '../rounds.service';

@Component({
  selector: 'app-round',
  templateUrl: './round.component.html'
})
export class RoundComponent implements OnInit {

  selectedRound$ = this.roundsService.selectedRound$;

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
