import { Component, Input, ViewChild } from "@angular/core";
import { AngularFirestore, AngularFirestoreDocument, DocumentChangeAction } from "angularfire2/firestore";
import { Observable } from "rxjs/Observable";
import { DocumentReference } from "@firebase/firestore-types";
import { FirebaseAuth } from "@firebase/auth-types";
import { respondElementToVisibility } from "../../helpers/helpers";

@Component({
  selector: "hubble",
  templateUrl: "./hubble.component.html",
  styleUrls: ["./hubble.component.css"]
})
export class HubbleComponent {
  @Input() hubbleId: string;
  @ViewChild("childrenList") childrenElement: any;
  hubble: Observable<Hubble>;
  children: Observable<DocumentChangeAction[]>;

  private hubbleDoc: AngularFirestoreDocument<Hubble>;
  private userDoc: AngularFirestoreDocument<any>;
  private db: AngularFirestore;

  constructor(db: AngularFirestore) {
    this.db = db;
    this.loadHubble();
  }

  async loadHubble() {
    const user = await this.getAuthenticated(this.db.app.auth());
    this.userDoc = this.db.collection("users").doc(user.uid);
    this.hubbleDoc = this.userDoc.collection("hubbles").doc(this.hubbleId);

    this.hubble = this.hubbleDoc.valueChanges();
    this.loadChildrenWhenVisible();

  }

  loadChildrenWhenVisible() {
    respondElementToVisibility(this.childrenElement.nativeElement, visible =>
      {
        if(visible && !this.children){
          this.children = this.userDoc.collection('hubbles', ref => ref.where('parent', '==', this.hubbleDoc.ref)).snapshotChanges();
        }
      })
  }

  updateContent(text: string) {
    if(text != "") {
      this.hubbleDoc.update({content: text});
    }
  }

  update(hubble: Partial<Hubble>)
  {
    this.hubbleDoc.update(hubble);
  }

  async getAuthenticated(auth: FirebaseAuth) {
    if (!auth.currentUser) {
      await auth.signInAndRetrieveDataWithEmailAndPassword(
        "elmar@elmarjansen.nl",
        "elma2209"
      );
    }
    return auth.currentUser;
  }
}
