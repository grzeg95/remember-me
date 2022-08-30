import {Component, Inject} from '@angular/core';
import {FIRESTORE} from 'angular-firebase';
import {AuthService} from 'auth';
import {doc, DocumentData, Firestore, getDoc, QueryDocumentSnapshot, SnapshotOptions} from 'firebase/firestore';
import {defaultGuestComponentConfig, GuestComponentConfig} from '../config.model';

@Component({
  selector: 'app-guest',
  templateUrl: './guest.component.html',
  styleUrls: ['./guest.component.scss']
})
export class GuestComponent {

  showUserDataPolicy = false;
  whileLoginIn$ = this.authService.whileLoginIn$;
  guestComponentConfig = defaultGuestComponentConfig;

  constructor(
    private authService: AuthService,
    @Inject(FIRESTORE) private readonly firestore: Firestore
  ) {
    getDoc(doc(this.firestore, 'config/guestComponent').withConverter({
      toFirestore(): DocumentData {
        return {};
      },
      fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): GuestComponentConfig {
        const data = snapshot.data(options)!;
        return {
          lastUpdate: data.lastUpdate,
          motto: data.motto
        } as GuestComponentConfig;
      }
    })).then((snap) => {
      if (snap.exists()) {
        const guestComponentConfig = snap.data();

        for (const key of Object.getOwnPropertyNames(guestComponentConfig)) {
          if (guestComponentConfig[key]) {
            this.guestComponentConfig[key] = guestComponentConfig[key];
          }
        }
      }
    });
  }

  renewCookie() {
    // @ts-ignore
    Cookiebot.renew();
  }
}
