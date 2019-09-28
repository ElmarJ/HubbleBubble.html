import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { AngularFireModule } from '@angular/fire';
import { AngularFireAuthModule } from '@angular/fire/auth';
import { AngularFirestoreModule } from '@angular/fire/firestore';
import { environment } from '../environments/environment';
import { HubbleParagraphComponent } from './hubbles/hubble-paragraph/hubble-paragraph.component';
import { HubbleCardComponent} from './hubbles/hubble-card/hubble-card.component';
import { HubbleCardOverviewComponent} from './hubbles/hubble-card-list/hubble-card-list.component';
import { ContentEditableDirective } from './contentEditableModel';

@NgModule({
  declarations: [
    AppComponent,
    HubbleParagraphComponent,
    HubbleCardComponent,
    HubbleCardOverviewComponent,
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
