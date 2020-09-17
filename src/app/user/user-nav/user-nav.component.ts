import {Component} from '@angular/core';
import {RouterDict} from '../../app.constants';

@Component({
  selector: 'app-nav-second',
  templateUrl: './user-nav.component.html',
  styleUrls: ['./user-nav.component.scss'],
  host: {class: 'app'}
})
export class UserNavComponent {

  routes = [
    {
      label: 'Today',
      href: '/' + RouterDict['user'] + '/' + RouterDict['today']
    },
    {
      label: 'Tasks',
      href: '/' + RouterDict['user'] + '/' + RouterDict['tasks']
    },
    {
      label: 'Editor',
      href: '/' + RouterDict['user'] + '/' + RouterDict['task']
    },
    {
      label: 'Order',
      href: '/' + RouterDict['user'] + '/' + RouterDict['times-of-day-order']
    }
  ];

}
