import {Component, OnDestroy, OnInit} from '@angular/core';
import {RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {RouterDict} from '../../app.constants';
import {RoundsService} from '../../services/rounds.service';

@Component({
  selector: 'app-rounds',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './rounds.component.html',
  styleUrl: './rounds.component.scss'
})
export class RoundsComponent implements OnInit, OnDestroy {

  selectedRound = this.roundsService.selectedRound;
  RouterDict = RouterDict;
  editedRound = this.roundsService.editedRound;

  constructor(
    private roundsService: RoundsService
  ) {
  }

  ngOnInit(): void {
    this.roundsService.init();
  }

  ngOnDestroy(): void {
    this.roundsService.clearCacheRound();
    this.roundsService.clearCacheRounds();
  }
}
