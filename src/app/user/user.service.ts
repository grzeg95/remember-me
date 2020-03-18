import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/firestore';
import {Observable} from 'rxjs';
import {AuthService} from '../auth/auth.service';
import {IUser} from '../auth/i-user';
import {ITasksListItem, ITodayItem} from './models';

@Injectable()
export class UserService {

  todayItemsFirstLoading = true;
  taskListItemsFirstLoading = true;
  todayOrderFirstLoading = true;

  todayItems: {[timeOfDay: string]: ITodayItem[]} = {};
  taskListItems: ITasksListItem[] = [];
  timesOfDayOrder: string[] = [];

  user$: Observable<IUser> = new Observable<IUser>();

  clearCache(): void {
    this.todayItems = {};
    this.taskListItems = [];
    this.timesOfDayOrder = [];
    this.todayItemsFirstLoading = true;
    this.taskListItemsFirstLoading = true;
    this.todayOrderFirstLoading = true;
  }

  prepareTimesOfDayOrder(timesOfDay: { [name: string]: { position: number; counter: number; }}): void {

    const orderTMP: {
      timeOfDay: string,
      position: number;
    }[] = [];

    Object.keys(timesOfDay).forEach((timeOfDay) => {
      orderTMP.push({
        timeOfDay,
        position: timesOfDay[timeOfDay].position
      });
    });

    this.timesOfDayOrder = orderTMP.sort((a, b) => {
      return a.position - b.position;
    }).map((a) => a.timeOfDay);

  }

  constructor(private afs: AngularFirestore,
              private authService: AuthService) {
    this.user$ = this.afs.doc<IUser>(`users/${this.authService.userData.uid}`).valueChanges();
  }

}
