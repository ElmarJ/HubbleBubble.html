import { Component } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireAuth } from '@angular/fire/auth';
import { HubbleBaseWithChildrenComponent } from '../hubble-with-children-base.component';

// todo: https://angular-templates.io/tutorials/about/firebase-authentication-with-angular


@Component({
  selector: 'app-hubble-tree-list',
  templateUrl: './hubble-tree-list.component.html',
  styleUrls: ['./hubble-tree-list.component.css']
})
export class HubbleTreeListComponent extends HubbleBaseWithChildrenComponent {

  constructor(public afAuth: AngularFireAuth, public db: AngularFirestore) {
    super(afAuth, db);
    this.loadHubble();
  }
}