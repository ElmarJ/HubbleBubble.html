import { HubbleTreeListComponent } from './hubbles/hubble-tree-list/hubble-tree-list.component';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { AngularFireModule } from '@angular/fire';
import { AngularFireAuthModule } from '@angular/fire/auth';
import { AngularFirestoreModule } from '@angular/fire/firestore';
import { environment } from '../environments/environment';
import { ContentEditableDirective } from './contentEditableModel';
import { AuthComponent } from './auth/auth.component';
import { HubbleTreeListRootComponent } from './hubbles/hubble-tree-list/hubble-tree-list-root.component';

@NgModule({
  declarations: [
    AppComponent,
    HubbleTreeListComponent,
    HubbleTreeListRootComponent,
    AuthComponent,
    ContentEditableDirective
  ],
  imports: [
    BrowserModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireAuthModule,
    AngularFirestoreModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
