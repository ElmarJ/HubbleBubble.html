import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { AngularFireModule } from 'angularfire2';
import { AngularFireAuthModule } from 'angularfire2/auth';
import { AngularFirestoreModule } from 'angularfire2/firestore';
import { environment } from '../environments/environment';
import { HubbleComponent } from './hubble/hubble.component';
import { HubbleCardComponent} from './hubble/hubble.card.component';
import { HubbleCardOverviewComponent} from './hubble/hubble.card.overview.component';
import { ContentEditableDirective } from './contentEditableModel';

@NgModule({
  declarations: [
    AppComponent,
    HubbleComponent,
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
