import {ChangeDetectionStrategy, Component} from '@angular/core';

@Component({
  selector: 'app-user-data-policy',
  templateUrl: './user-data-policy.component.html',
  styleUrls: ['./user-data-policy.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserDataPolicyComponent {

  constructor() {
  }
}
