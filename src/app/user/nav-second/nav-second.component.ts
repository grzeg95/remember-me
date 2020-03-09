import {Component} from '@angular/core';

@Component({
  selector: 'app-nav-second',
  templateUrl: './nav-second.component.html',
  styleUrls: ['./nav-second.component.sass'],
  host: { class: 'app' }
})
export class NavSecondComponent {

  routes = [
    {
      icon: 'fas fa-align-left',
      label: 'Today',
      href: '/user/today'
    },
    {
      icon: 'fas fas fa-list-ul',
      label: 'Tasks',
      href: '/user/tasks-list'
    },
    {
      icon: 'fas fa-pencil-alt',
      label: 'Editor',
      href: '/user/task-editor'
    },
    {
      icon: 'fas fa-sort',
      label: 'Order',
      href: '/user/today-order'
    }
  ];

  constructor() {}

}
