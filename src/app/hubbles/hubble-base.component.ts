import { Component, Input, ViewChild } from '@angular/core';
import { AngularFirestore, AngularFirestoreDocument, DocumentChangeAction } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { AngularFireAuth } from '@angular/fire/auth';

// todo: https://angular-templates.io/tutorials/about/firebase-authentication-with-angular

export abstract class HubbleBaseComponent {
  @Input() hubbleId: string;
  hubble: Observable<Hubble>;

  public hubbleDoc: AngularFirestoreDocument<Hubble>;
  public userDoc: AngularFirestoreDocument<any>;

  constructor(public afAuth: AngularFireAuth, public db: AngularFirestore) {
    this.loadHubble();
  }

  async loadHubble() {
    const user = await this.getAuthenticated();
    this.userDoc = this.db.collection('users').doc(user.uid);
    this.hubbleDoc = this.userDoc.collection('hubbles').doc(this.hubbleId);

    this.hubble = this.hubbleDoc.valueChanges();
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
