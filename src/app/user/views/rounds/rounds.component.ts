import {ChangeDetectionStrategy, Component, OnDestroy, OnInit} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {skip} from 'rxjs/operators';
import {RouterDict} from '../../../app.constants';
import {RoundsService} from './rounds.service';

@Component({
  selector: 'app-rounds',
  templateUrl: './rounds.component.html',
  styleUrls: ['./rounds.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoundsComponent implements OnInit, OnDestroy {

  selectedRound = toSignal(this.roundsService.selectedRound$.pipe(skip(1)));
  RouterDict = RouterDict;

  editedRound = toSignal(this.roundsService.editedRound$);

  constructor(
    private roundsService: RoundsService
  ) {
  }

  ngOnInit(): void {
    this.roundsService.init();
  }

  ngOnDestroy(): void {
    this.roundsService.clearCache();
  }
}
