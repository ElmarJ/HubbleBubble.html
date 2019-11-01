import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';

@Injectable()
export class UserProfileService {
  isLoggedIn = false;
  public afAuth: AngularFireAuth;

  async authenticate() {
    if (!this.afAuth.auth.currentUser) {
      await this.afAuth.auth.signInWithEmailAndPassword(
        'elmar@elmarjansen.nl',
        'elma2209'
      );
    }
  }

  async getUser() {
    await this.authenticate();
    return this.afAuth.auth.currentUser;
  }
}
