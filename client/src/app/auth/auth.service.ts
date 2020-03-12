import { Injectable } from '@angular/core';

import { HttpClient, HttpRequest, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';

import { Observable, of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // key used for saving the token in session storage
  private TOKEN_KEY = 'api-user-token';
  private USER_ID_KEY = 'api-user-id';

  private loginUrl = '/api/ApiUsers/login';
  private logoutUrl = '/api/ApiUsers/logout';
  private findByIdUrl = '/api/ApiUsers';

  constructor(private http: HttpClient, private router: Router) { }

  public isAuthenticated(): Observable<boolean> {
    let tokenInSession = this.getTokenFromSession();
    if (tokenInSession && tokenInSession.token && tokenInSession.id) {
      let url = this.findByIdUrl + '/' + tokenInSession.id + '/accessTokens/' + tokenInSession.token + '?access_token=' + tokenInSession.token;
      return this.http.get(url).pipe(map(res => {
        // If we get a successful response here, we know the user is logged in.
        return true;
      }))
    } else {
      this.router.navigate(['/login'])
      return of(false);
    }
  }

  // Returns an Observable that will make the login request to the server and return the json containing the token
  public login(credentials: any): Observable<any> {
    return this.http.post(this.loginUrl, credentials).pipe(map(token => {
      this.saveTokenInSession(token)
      return token
    }))
  }

  // Returns an Observable that will make the logout request to the server with the token in session storage
  public logout(): Observable<boolean> {
    let tokenInSession = this.getTokenFromSession();
    if (tokenInSession && tokenInSession.token) {
      let url = this.logoutUrl + '?access_token=' + tokenInSession.token;
      return this.http.post(url, {}).pipe(map(resp => {
        this.removeTokenFromSession()
        return true
      }))
    } else {
      return of(true)
    }
  }

  // Function that will make an authenticated GET request to the server.  
  // If an Unauthenicated is returned by the server, then it will route to the login page.
  // You need a URL and an array of objects that contains a name and value for example [ { name: 'id', value: 1 }]
  public makeAuthenticatedHttpGet(url, queryParams?): Observable<any> {

    let params = new HttpParams().set('access_token', this.getTokenFromSession().token)

    if (queryParams && queryParams.length > 0) {
      for (let qp of queryParams) {
        params = params.append(qp.name, qp.value.toString())
      }
    }
    
    return this.http.get(url, { params: params }).pipe(catchError((error, caught) => {
      return this.handleError(error)
    }))
  }

  public makeAuthenticatedHttpJsonPost(url, data): Observable<any> {
    let params = new HttpParams().set('access_token', this.getTokenFromSession().token);
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post(url, data, { params: params }).pipe(catchError((error, caught) => {
      return this.handleError(error)
    }))
  }

  public makeAuthenticatedHttpJsonPut(url, data): Observable<any> {
    let params = new HttpParams().set('access_token', this.getTokenFromSession().token);
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put(url, data, { params: params }).pipe(catchError((error, caught) => {
      return this.handleError(error)
    }))
  }

  public makeAuthenticatedHttpFormDataPost(url, formData:FormData): Observable<any> {
    let params = new HttpParams().set('access_token', this.getTokenFromSession().token);
    return this.http.post(url, formData, { params: params }).pipe(catchError((error, caught) => {
      return this.handleError(error)
    }))
  }

  public makeAuthenticatedHttpDelete(url, queryParams?): Observable<any> {

    let params = new HttpParams().set('access_token', this.getTokenFromSession().token);

    if (queryParams && queryParams.length > 0) {
      for (let qp of queryParams) {
        params = params.append(qp.name, qp.value.toString())
      }
    }

    return this.http.delete(url, { params: params }).pipe(catchError((error, caught) => {
      return this.handleError(error)
    }))

  }

  // Save the token returned from the login response in session storage
  saveTokenInSession(token: any) {
    if (token && token.id) {
      sessionStorage.setItem(this.TOKEN_KEY, token.id);
      sessionStorage.setItem(this.USER_ID_KEY, token.userId);
    }
  }

  // Remove the token from session storage.
  public removeTokenFromSession(): boolean {
    let tokenInSession = this.getTokenFromSession();
    if (tokenInSession) {
      sessionStorage.removeItem(this.TOKEN_KEY);
      sessionStorage.removeItem(this.USER_ID_KEY);
      return true;
    }
    return false;
  }

  // Retrieve the api token from the session storage and null if not found
  getTokenFromSession() {
    return {
      token: sessionStorage.getItem(this.TOKEN_KEY),
      id: sessionStorage.getItem(this.USER_ID_KEY)
    }
  }

  handleError(error: HttpErrorResponse) {
    if (error.status === 401) {
      return this.router.navigate(['unprotected', 'login'])
    }
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error('An error occurred:', error.error.message);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong,
      console.error(
        `Backend returned code ${error.status}, ` +
        `body was: ${this.findErrorMessage(error)}`);
    }
    // return an ErrorObservable with a user-facing error message
    return throwError (
      this.findErrorMessage(error));
  }

  findErrorMessage(error) {
    if (error.error) {
      return this.findErrorMessage(error.error)
    }
    if (error.message) {
      return error.message
    }
    return error
  }
}
