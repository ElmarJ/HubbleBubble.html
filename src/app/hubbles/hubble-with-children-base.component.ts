import { DocumentData } from '@firebase/firestore-types';
import { HubbleBaseComponent } from './hubble-base.component';
import { Observable } from 'rxjs';
import { ViewChild } from '@angular/core';
import { respondElementToVisibility } from '../shared/helpers/helpers';

export abstract class HubbleBaseWithChildrenComponent extends HubbleBaseComponent {
  @ViewChild('childrenList', { static: true }) childrenElement: any;
  children: Observable<DocumentData[]>;

  async loadHubble() {
    super.loadHubble();
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
}
