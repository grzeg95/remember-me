import {Component, OnDestroy, OnInit} from '@angular/core';
import {UserService} from './user.service';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  host: { class: 'app' }
})
export class UserComponent implements OnInit, OnDestroy {

  constructor(private userService: UserService) {}

  ngOnInit(): void  {
    this.userService.clearCache();
  }

  ngOnDestroy(): void  {
    this.userService.clearCache();
  }

}
