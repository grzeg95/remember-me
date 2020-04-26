import {Component} from '@angular/core';
import {faAlignLeft, faListUl, faPencilAlt, faSort} from '@fortawesome/free-solid-svg-icons';

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
      href: '/user/today'
    },
    {
      icon: faListUl,
      label: 'Tasks',
      href: '/user/tasks-list'
    },
    {
      icon: faPencilAlt,
      label: 'Editor',
      href: '/user/task-editor'
    },
    {
      icon: faSort,
      label: 'Order',
      href: '/user/today-order'
    }
  ];

  constructor() {
  }

}
