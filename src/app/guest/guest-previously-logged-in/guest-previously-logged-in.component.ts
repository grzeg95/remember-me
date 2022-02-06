import {Component, OnDestroy, OnInit} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {Subscription} from 'rxjs';
import {filter, take} from 'rxjs/operators';
import {AppService} from '../../app-service';
import {UserRemembered} from '../../models';

@Component({
  selector: 'app-guest-previously-logged-in',
  templateUrl: './guest-previously-logged-in.component.html',
  styleUrls: ['./guest-previously-logged-in.component.scss']
})
export class GuestPreviouslyLoggedInComponent implements OnInit, OnDestroy {

  dbIsReadySub: Subscription;
  storedUsers: UserRemembered[] = [];
  firstLoading = true;

  constructor(
    public dialogRef: MatDialogRef<GuestPreviouslyLoggedInComponent>,
    private appService: AppService
  ) {
  }

  ngOnInit(): void {
    this.getStoredUsers();
  }

  getStoredUsers(): void {
    this.dbIsReadySub = this.appService.dbIsReady$
      .pipe(
        filter((isReady) => isReady === 'will not' || isReady),
        take(1)
      ).subscribe(async () => {
        try {
          const storedUsersCryproKeysMap = await this.appService.getMapOfUsersFromDb();
          const storedUsersCryproKeys = [];

          for (const id of Object.getOwnPropertyNames(storedUsersCryproKeysMap)) {
            const user = {...storedUsersCryproKeysMap[id]};
            storedUsersCryproKeys.push({
              ...user,
              id
            } as UserRemembered);
          }
          this.storedUsers = storedUsersCryproKeys;
          this.firstLoading = false;
        } catch (e) {
          this.firstLoading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.dbIsReadySub.unsubscribe();
  }

  removeUser(id: string) {
    this.appService.deleteFromDb('remember-me-database-keys', id).finally(() => {
      this.getStoredUsers();
    });
  }
}
