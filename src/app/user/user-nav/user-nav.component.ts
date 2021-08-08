import {Component} from '@angular/core';
import {Router} from '@angular/router';
import {RouterDict} from '../../app.constants';

@Component({
  selector: 'app-nav-second',
  templateUrl: './user-nav.component.html',
  styleUrls: ['./user-nav.component.scss']
})
export class UserNavComponent {

  get isNudeUser(): boolean {
    return this.router.isActive('/' + RouterDict.user, true);
  }

  routes = [
    {
      label: 'Today',
      href: '/' + RouterDict.user + '/' + RouterDict.today
    },
    {
      label: 'Tasks',
      href: '/' + RouterDict.user + '/' + RouterDict.tasks
    },
    {
      label: 'Editor',
      href: '/' + RouterDict.user + '/' + RouterDict.task
    },
    {
      label: 'Order',
      href: '/' + RouterDict.user + '/' + RouterDict.timesOfDayOrder
    }
  ];

  constructor(protected router: Router) {
  }

}
