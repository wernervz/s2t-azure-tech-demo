import { Injectable } from '@angular/core';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  TRANSCRIPT_CONTROL_API = '/api/TranscriptionControl/';

  constructor(private authSvc: AuthService) { }

  public getTranscription(id: number) {
    const params = [
      {
        name: 'id',
        value: id
      }
    ]
    return this.authSvc.makeAuthenticatedHttpGet(this.TRANSCRIPT_CONTROL_API + 'findOwnedById', params);
  }

  public transcribeAudio(fileToUpload: File) {
    const fd = new FormData();
    fd.append('file', fileToUpload, fileToUpload.name);
    // Make the call to the server
    return this.authSvc.makeAuthenticatedHttpFormDataPost(this.TRANSCRIPT_CONTROL_API + 'transcribeAudio', fd);
  }

  public getAudioUrl(id) {
    const params = [
      {
        name: 'id',
        value: id
      }
    ];
    return this.authSvc.makeAuthenticatedHttpGet(this.TRANSCRIPT_CONTROL_API + 'getAudioUrl', params);
  }

  public getExistingTranscriptions() {
    const params = [{
      name: 'filter',
      value: JSON.stringify({ fields: ['id', 'userId', 'fileName', 'progress', 'status']})
    }];
    return this.authSvc.makeAuthenticatedHttpGet(this.TRANSCRIPT_CONTROL_API, params);
  }

  public cleanupExistingTranscription(id) {
    const params = [
      {
        name: 'id',
        value: id
      }
    ];
    return this.authSvc.makeAuthenticatedHttpDelete(this.TRANSCRIPT_CONTROL_API + 'cleanupExistingResources', params);
  }
}
