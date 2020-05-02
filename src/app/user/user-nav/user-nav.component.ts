import {Component} from '@angular/core';
import {faAlignLeft, faListUl, faPencilAlt, faSort} from '@fortawesome/free-solid-svg-icons';
import {RouterDict} from '../../app.constants';

@Component({
  selector: 'app-nav-second',
  templateUrl: './user-nav.component.html',
  styleUrls: ['./user-nav.component.sass'],
  host: {class: 'app'}
})
export class UserNavComponent {

  routes = [
    {
      icon: faAlignLeft,
      label: 'Today',
      href: '/' + RouterDict['user'] + '/' + RouterDict['today']
    },
    {
      icon: faListUl,
      label: 'Tasks',
      href: '/' + RouterDict['user'] + '/' + RouterDict['tasks']
    },
    {
      icon: faPencilAlt,
      label: 'Editor',
      href: '/' + RouterDict['user'] + '/' + RouterDict['task']
    },
    {
      icon: faSort,
      label: 'Order',
      href: '/' + RouterDict['user'] + '/' + RouterDict['times-of-day-order']
    }
  ];

  constructor() {
  }

}
