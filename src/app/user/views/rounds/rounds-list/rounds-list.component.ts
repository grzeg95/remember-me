import {Component} from '@angular/core';
import {Observable} from 'rxjs';
import {AppService} from '../../../../app-service';
import {RoundsService} from '../rounds.service';
import {ActivatedRoute, Router} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {RouterDict} from '../../../../app.constants';
import {Round} from '../../../models';
import {faEdit} from '@fortawesome/free-regular-svg-icons';

@Component({
  selector: 'app-rounds-list',
  templateUrl: './rounds-list.component.html',
  styleUrls: ['./rounds-list.component.scss']
})
export class RoundsListComponent {

  get isOnline$(): Observable<boolean> {
    return this.appService.isOnline$;
  }

  get roundsListFirstLoad$(): Observable<boolean> {
    return this.roundsService.roundsListFirstLoad$;
  }

  get roundsOrderFirstLoading$(): Observable<boolean> {
    return this.roundsService.roundsOrderFirstLoading$;
  }

  displayedColumns: string[] = ['roundName', 'taskSize', 'timesOfDay', 'edit'];
  faEdit = faEdit;

  get roundsList$(): Observable<Round[]> {
    return this.roundsService.roundsList$;
  }

  get roundsOrder$(): Observable<string[]> {
    return this.roundsService.roundsOrder$;
  }

  constructor(
    protected roundsService: RoundsService,
    protected router: Router,
    public dialog: MatDialog,
    protected route: ActivatedRoute,
    protected appService: AppService
  ) {
  }

  addRound(): void {
    this.router.navigate(['../', RouterDict.roundEditor], {relativeTo: this.route});
  }

  editRound(round: Round): void {
    this.router.navigate(['../', RouterDict.roundEditor, round.id], {relativeTo: this.route});
  }

  goToRound(roundId: string): void {
    this.router.navigate(['../', roundId, RouterDict.todayTasks], {relativeTo: this.route});
  }

  sortRoundList(rounds: Round[], roundsOrder: string[]): Round[] {

    const roundsMap: {[key in string]: Round} = {};

    for (const round of rounds) {
      roundsMap[round.id] = round;
    }

    return roundsOrder.map((roundId) => roundsMap[roundId]);
  }
}
