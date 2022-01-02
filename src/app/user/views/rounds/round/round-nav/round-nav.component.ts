import {Component} from '@angular/core';
import {Router} from '@angular/router';
import {RouterDict} from '../../../../../app.constants';

@Component({
  selector: 'app-nav-second',
  templateUrl: './round-nav.component.html',
  styleUrls: ['./round-nav.component.scss']
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

  constructor(protected router: Router) {
  }

}
