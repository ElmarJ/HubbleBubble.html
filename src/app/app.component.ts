import { Component } from '@angular/core';
import { Observable } from 'rxjs';

export interface Hubble { content: string; }

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  title = 'HubbleBubble';
  children: Observable<any[]>;
  hubble;
  constructor() {
  }
}
