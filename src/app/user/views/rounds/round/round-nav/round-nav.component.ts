import {ChangeDetectionStrategy, Component} from '@angular/core';
import {RouterDict} from '../../../../../app.constants';

@Component({
  selector: 'app-round-nav',
  templateUrl: './round-nav.component.html',
  styleUrls: ['./round-nav.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoundNavComponent {

  routes = [
    {
      label: 'Today',
      href: './' + RouterDict.todayTasks
    },
    {
      label: 'Tasks',
      href: './' + RouterDict.tasksList
    },
    {
      label: 'Editor',
      href: './' + RouterDict.taskEditor
    },
    {
      label: 'Order',
      href: './' + RouterDict.timesOfDayOrder
    }
  ];

  constructor() {
  }
}
