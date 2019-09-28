import { Component, Input, ViewChild } from '@angular/core';
import { AngularFirestore, AngularFirestoreDocument, DocumentChangeAction } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { DocumentReference, DocumentData } from '@firebase/firestore-types';
import { AngularFireAuth } from '@angular/fire/auth';
import { auth } from 'firebase/app';
import { respondElementToVisibility } from '../../shared/helpers/helpers';

// todo: https://angular-templates.io/tutorials/about/firebase-authentication-with-angular


@Component({
  selector: 'app-hubble-tree-list',
  templateUrl: './hubble-tree-list.component.html',
  styleUrls: ['./hubble-tree-list.component.css']
})
export class HubbleTreeListComponent {
  @Input() hubbleId: string;
  @ViewChild('childrenList', { static: true }) childrenElement: any;
  hubble: Observable<Hubble>;
  children: Observable<DocumentData[]>;

  private hubbleDoc: AngularFirestoreDocument<Hubble>;
  private userDoc: AngularFirestoreDocument<any>;
// Todo: see https://github.com/angular/angularfire2/blob/master/docs/firestore/collections.md
  constructor(public afAuth: AngularFireAuth, public db: AngularFirestore) {
    this.loadHubble();
  }

  async loadHubble() {
    const user = await this.getAuthenticated();
    this.userDoc = this.db.collection('users').doc(user.uid);
    this.hubbleDoc = this.userDoc.collection('hubbles').doc(this.hubbleId);

    this.hubble = this.hubbleDoc.valueChanges();
    this.loadChildrenWhenVisible();

  }

  loadChildrenWhenVisible() {
    respondElementToVisibility(
        this.childrenElement.nativeElement,
        visible => {
          if (visible && !this.children) {
            this.children = this.userDoc.collection('hubbles', ref => ref.where('parent', '==', this.hubbleDoc.ref)).snapshotChanges();
          }
        }
    );
  }

  updateContent(text: string) {
    if (text !== '') {
      this.hubbleDoc.update({content: text});
    }
  }

  update(hubble: Partial<Hubble>) {
    this.hubbleDoc.update(hubble);
  }

  async getAuthenticated() {
    if (!this.afAuth.auth.currentUser) {
      await this.afAuth.auth.signInWithEmailAndPassword(
        'elmar@elmarjansen.nl',
        'elma2209'
      );
    }
    return this.afAuth.auth.currentUser;
  }
}
