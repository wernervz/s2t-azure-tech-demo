import { Component, OnInit, Input } from '@angular/core';
import { FormControl, FormGroup, FormBuilder } from '@angular/forms';

import { DataService } from 'src/app/shared/data.service';
import { AuthService } from 'src/app/auth/auth.service';

@Component({
  selector: 'app-transcript',
  templateUrl: './transcript.component.html',
  styleUrls: ['./transcript.component.scss']
})
export class TranscriptComponent implements OnInit {

  form: FormGroup;

  activeUser;
  activeFileName = 'None';
  activeProgress = 'Not Started...';
  activeTranscription: any = [];
  activeAudioUrl;
  activeTranscriptionId;

  isTranscriptionInProgress = false;
  isTranscriptSelectionOpen = false;
  showTranscriptionFailure = false;

  existingTranscriptions;
  selectedTranscript;

  alertMsg;
  warningMsg;
  errorMsg;
  transcriptionFailureMsg;

  constructor(private formBuilder: FormBuilder, private dataSvc: DataService, private authSvc: AuthService) { }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      audioFileRef: ['']
    });
    const userId = this.authSvc.getTokenFromSession().id;
    this.authSvc.makeAuthenticatedHttpGet('/api/ApiUsers/' + userId).subscribe({
      next: (findUserOutcome) => {
        this.activeUser = findUserOutcome.username;
      }
    });
    this.dataSvc.getExistingTranscriptions().subscribe({
      next: (existingTranscriptionsOutcome) => {
        if (existingTranscriptionsOutcome.length > 0) {
          this.selectedTranscript = existingTranscriptionsOutcome[existingTranscriptionsOutcome.length - 1];
          this.activeTranscriptionId = this.selectedTranscript.id;
          if (this.selectedTranscript.progress !== 'COMPLETE') {
            this.isTranscriptionInProgress = true;
            this.monitorTranscriptionProcess();
          } else {
            this.loadSelectedTranscription();
          }
        }
      }
    });
  }

  onFileChange(event) {
    console.log(event);
    if (event.target.files.length > 0) {
      // Reset
      this.activeAudioUrl = null;
      this.activeTranscription = [];
      this.activeTranscriptionId = null;
      // Submit
      const file = event.target.files[0];
      this.activeFileName = file.name;
      this.form.get('audioFileRef').setValue(file);
      // Show the status popup
      this.isTranscriptionInProgress = true;
      // Trigger the transcription process
      this.dataSvc.transcribeAudio(event.target.files[0]).subscribe({
        next: (transcribeAudioOutcome) => {
          this.activeProgress = transcribeAudioOutcome.progress;
          this.activeTranscriptionId = transcribeAudioOutcome.id;
          this.monitorTranscriptionProcess();
        },
        error: (e) => {
          this.isTranscriptionInProgress = false;
          this.showErrorMsg(e);
        }
      });
    }
  }

  monitorTranscriptionProcess() {
    this.dataSvc.getTranscription(this.activeTranscriptionId).subscribe({
      next: (getTranscriptionOutcome) => {
        console.log(getTranscriptionOutcome)
        this.activeProgress = getTranscriptionOutcome.progress;
        if (getTranscriptionOutcome.progress !== 'COMPLETE') {
          if (getTranscriptionOutcome.progress === 'FAILED') {
            this.isTranscriptionInProgress = false;
            this.transcriptionFailureMsg = 'Transcription processing error: ' +
              getTranscriptionOutcome.status.status + ' with ' + getTranscriptionOutcome.status.statusMessage;
            this.showTranscriptionFailure = true;
          } else {
            setTimeout(() => {
              this.monitorTranscriptionProcess();
            }, 10000);
          }
        } else {
          this.isTranscriptionInProgress = false;
          this.loadTranscription();
        }
      }
    });
  }

  loadSelectedTranscription() {
    // Reset
    this.activeAudioUrl = undefined;
    this.activeTranscription = [];
    // Load
    this.isTranscriptSelectionOpen = false;
    this.activeTranscriptionId = this.selectedTranscript.id;
    this.loadTranscription();
  }

  loadTranscription() {
    this.activeTranscription = [];
    this.activeAudioUrl = null;

    this.dataSvc.getTranscription(this.activeTranscriptionId).subscribe({
      next: (getTranscriptionOutcome) => {
        console.log(getTranscriptionOutcome);
        // Check the actual transcription status
        if (getTranscriptionOutcome.transcription &&
              getTranscriptionOutcome.transcription.transcript &&
                getTranscriptionOutcome.transcription.transcript.AudioFileResults[0]) {
          if (getTranscriptionOutcome.transcription.transcript.AudioFileResults[0].SegmentResults.length > 0) {
            //  Check whether this audio is multi channel
            if (getTranscriptionOutcome.transcription.transcript.AudioFileResults[0].CombinedResults.length > 1) {
              this.showWarningMsg('This Audio file seems to be a multi-channel audio recording.' +
                ' Convert this to mono channel to see diarization.');
            }
            // Load the Segments as the transcription
            for (const seg of getTranscriptionOutcome.transcription.transcript.AudioFileResults[0].SegmentResults) {
              if (this.activeTranscription.length > 0 &&
                    seg.SpeakerId === this.activeTranscription[this.activeTranscription.length - 1].SpeakerId) {
                this.activeTranscription[this.activeTranscription.length - 1].phrase += ' ' + seg.NBest[0].Display;
              } else {
                this.activeTranscription.push({
                  SpeakerId: seg.SpeakerId,
                  position: seg.SpeakerId === '1' ? 'left' : 'right',
                  phrase: seg.NBest[0].Display,
                  sentiment: seg.NBest[0].Sentiment
                });
              }
            }
          } else {
            this.transcriptionFailureMsg = 'This was probably a dual channel recording.  Please convert to mono first.';
            this.showTranscriptionFailure = true;
          }
        } else {
          if (getTranscriptionOutcome.status && getTranscriptionOutcome.status.status) {
            this.transcriptionFailureMsg = 'Transcription processing error: ' +
              getTranscriptionOutcome.status.status + ' with ' + getTranscriptionOutcome.status.statusMessage;
            this.showTranscriptionFailure = true;
          }
        }
        this.dataSvc.getAudioUrl(this.activeTranscriptionId).subscribe({
          next: (getAudioUrlOutcome) => {
            // console.log(getAudioUrlOutcome);
            this.activeAudioUrl = getAudioUrlOutcome.url;
          }
        });
      },
      error: (e) => {
        console.log(e);
      }
    });
  }

  selectExistingTranscription() {
    this.dataSvc.getExistingTranscriptions().subscribe({
      next: (getExistingTranscriptionsOutcome) => {
        for (const t of getExistingTranscriptionsOutcome) {
          if (!t.status) {
            t.status = {
              lastActionDateTime: new Date().toDateString()
            };
          }
        }
        this.existingTranscriptions = getExistingTranscriptionsOutcome;
        this.isTranscriptSelectionOpen = true;
      }
    });
  }

  deleteExistingTranscription() {
    this.isTranscriptSelectionOpen = false;
    this.dataSvc.cleanupExistingTranscription(this.selectedTranscript.id).subscribe({
      next: (cleanupExistingTranscriptionOutcome) => {
        this.showAlertMsg('Transcript successfully removed.');
      },
      error: (e) => {
        this.showErrorMsg(e);
      }
    });
  }

  showWarningMsg(a) {
    this.warningMsg = a;
    setTimeout(() => {
      this.warningMsg = null;
    }, 5000);
  }

  showAlertMsg(a) {
    this.alertMsg = a;
    setTimeout(() => {
      this.alertMsg = null;
    }, 5000);
  }

  showErrorMsg(e) {
    this.errorMsg = e;
    setTimeout(() => {
      this.errorMsg = null;
    }, 5000);
  }

  isTranscriptSelected() {
    return this.selectedTranscript !== undefined;
  }
}
