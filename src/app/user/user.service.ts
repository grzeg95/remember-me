import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/firestore';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {AuthService} from '../auth/auth.service';
import {IUser} from '../auth/i-user';
import {ITasksListItem, ITodayItem, TimeOfDay} from './models';

@Injectable()
export class UserService {

  todayItemsFirstLoading = true;
  taskListItemsFirstLoading = true;
  todayOrderFirstLoading = true;

  todayItems: {[timeOfDay: string]: ITodayItem[]} = {};
  taskListItems: ITasksListItem[] = [];
  timesOfDayOrder: string[] = [];

  timesOfDayOrder$: Observable<string[]> = new Observable<string[]>();

  clearCache(): void {
    this.todayItems = {};
    this.taskListItems = [];
    this.timesOfDayOrder = [];
    this.todayItemsFirstLoading = true;
    this.taskListItemsFirstLoading = true;
    this.todayOrderFirstLoading = true;
  }

  constructor(private afs: AngularFirestore,
              private authService: AuthService) {
    this.timesOfDayOrder$ = this.afs
      .doc<IUser>(`users/${this.authService.userData.uid}`)
      .collection('timesOfDay', (ref) => ref.orderBy('position'))
      .valueChanges().pipe(map((timesOfDay) => {

        const timesOfDayNames = [];

        timesOfDay.forEach((timeOfDay: TimeOfDay) => {
          timesOfDayNames.push(timeOfDay.name);
        });

        return timesOfDayNames;

      }));
  }

}
