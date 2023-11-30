import {Component} from '@angular/core';
import {ActivatedRoute, RouterOutlet} from '@angular/router';
import {RoundsService} from '../rounds.service';
import {RoundNavComponent} from './round-nav/round-nav.component';

@Component({
  selector: 'app-round',
  standalone: true,
  imports: [
    RoundNavComponent,
    RouterOutlet
  ],
  templateUrl: './round.component.html'
})
export class RoundComponent {

  selectedRound = this.roundsService.selectedRound;

  constructor(
    private route: ActivatedRoute,
    private roundsService: RoundsService
  ) {
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((paramMap) => {
      this.roundsService.setGettingOfRoundById(paramMap.get('id') || '')
    });
  }
}
