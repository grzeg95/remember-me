import { Component } from '@angular/core';
import {ConnectionService} from '../../services/connection.service';

@Component({
  selector: 'app-offline',
  standalone: true,
  imports: [],
  templateUrl: './offline.component.html',
  styleUrl: './offline.component.scss'
})
export class OfflineComponent {

  protected readonly _isOnline = this.connectionService.isOnlineSig.get();

  constructor(
    private connectionService: ConnectionService
  ) {
  }
}
