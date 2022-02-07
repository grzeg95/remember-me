import {Component} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';

@Component({
  selector: 'app-guest-about-security',
  templateUrl: './guest-about-security.component.html',
  styleUrls: ['./guest-about-security.component.scss']
})
export class GuestAboutSecurityComponent {

  constructor(
    public dialogRef: MatDialogRef<GuestAboutSecurityComponent>
  ) {}
}
