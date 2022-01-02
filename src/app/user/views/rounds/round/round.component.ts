import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {RoundsService} from '../rounds.service';

@Component({
  selector: 'app-times-of-day-item',
  templateUrl: './round.component.html'
})
export class RoundComponent implements OnInit {

  constructor(
      private route: ActivatedRoute,
      private roundsService: RoundsService
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
