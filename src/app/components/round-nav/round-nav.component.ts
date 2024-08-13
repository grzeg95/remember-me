import {NgForOf} from '@angular/common';
import {Component} from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {RouterDict} from '../../app.constants';

@Component({
  selector: 'app-round-nav',
  standalone: true,
  templateUrl: './round-nav.component.html',
  imports: [
    NgForOf,
    RouterLink,
    RouterLinkActive
  ],
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

  constructor() {
  }
}
