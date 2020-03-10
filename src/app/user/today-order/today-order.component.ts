import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {Component, OnDestroy, OnInit} from '@angular/core';
import {AngularFirestore} from '@angular/fire/firestore';
import {AngularFireFunctions} from '@angular/fire/functions';
import {Subscription} from 'rxjs';
import {AuthService} from '../../auth/auth.service';
import {IUserAuth} from '../../auth/user.auth';
import {UserService} from '../user.service';

@Component({
  selector: 'app-today-order',
  templateUrl: './today-order.component.html',
  styleUrls: ['./today-order.component.sass'],
  host: { class: 'app' }
})
export class TodayOrderComponent implements OnInit, OnDestroy {

  get order(): string[] {
    return this.userService.timesOfDayOrder;
  }

  set order(newOrder: string[]) {
    this.userService.timesOfDayOrder = newOrder;
  }

  get todayOrderFirstLoading(): boolean {
    return this.userService.todayOrderFirstLoading;
  }

  set todayOrderFirstLoading(value: boolean) {
    this.userService.todayOrderFirstLoading = value;
  }

  disabled = false;
  userSubscription: Subscription = new Subscription();
  isEmpty = true;

  constructor(private authService: AuthService,
              private fns: AngularFireFunctions,
              private afs: AngularFirestore,
              private userService: UserService) {}

  drop(event: CdkDragDrop<string[]>): void {

    if (event.previousIndex === event.currentIndex) {
      return;
    }

    moveItemInArray(this.order, event.previousIndex, event.currentIndex);

    this.disabled = true;
    this.fns.httpsCallable('setTodayOrder')(this.order).subscribe(() => {
      console.log('OK');
      this.disabled = false;
    }, (error) => {
      console.log(error);
      this.disabled = false;
    });

  }

  ngOnInit(): void {

    if (this.order.length !== 0) {
      this.isEmpty = false;
    }

    this.userSubscription = this.afs.doc(`users/${this.authService.userData.uid}`).valueChanges().subscribe((user: IUserAuth) => {
      if (user.timesOfDay) {

        const orderTMP: {
          timeOfDay: string,
          position: number;
        }[] = [];

        Object.keys(user.timesOfDay).forEach((timeOfDay) => {
          orderTMP.push({
            timeOfDay,
            position: user.timesOfDay[timeOfDay].position
          });
        });

        this.order = orderTMP.sort((a, b) => {
          return a.position - b.position;
        }).map((a) => a.timeOfDay);

        this.todayOrderFirstLoading = false;
        this.isEmpty = this.order.length === 0;

      }
    });
  }

  ngOnDestroy(): void {
    this.userSubscription.unsubscribe();
  }

}
