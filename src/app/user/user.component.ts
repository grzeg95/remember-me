import {Component, OnDestroy, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {RouterDict} from '../app.constants';
import {UserService} from './user.service';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss']
})
export class UserComponent implements OnInit, OnDestroy {

  get isNudeUser(): boolean {
    return this.router.isActive('/' + RouterDict['user'], true);
  }

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userService.init();
  }

  ngOnDestroy(): void {
    this.userService.clearCache();
  }

}
