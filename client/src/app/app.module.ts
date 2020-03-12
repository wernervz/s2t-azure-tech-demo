import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ClarityModule } from '@clr/angular';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ProtectedComponent } from './protected/protected.component';
import { UnprotectedComponent } from './unprotected/unprotected.component';
import { AuthModule } from './auth/auth.module';
import { TranscriptComponent } from './protected/transcript/transcript.component';
import { UtteranceComponent } from './protected/transcript/utterance/utterance.component';
import { SentimentComponent } from './protected/transcript/sentiment/sentiment.component';

@NgModule({
  declarations: [
    AppComponent,
    ProtectedComponent,
    UnprotectedComponent,
    TranscriptComponent,
    UtteranceComponent,
    SentimentComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ClarityModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    AuthModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
