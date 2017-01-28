var KoboToolboxOAuth2;

/**
 * OAuth2 authentication for KoboToolbox
 * Based on the samples in https://github.com/googlesamples/apps-script-oauth2
 */
function initKoboToolboxOAuth2() {
  KoboToolboxOAuth2 = {
    KOBO_CLIENT_ID: 'put your client_id here',
    KOBO_CLIENT_SECRET: 'put your client_secret here',
    
    accessToken: null,
    
    /**
     * Returns the authorization string for this auth method.
     */
    getAuthString: function() {
      return 'Bearer ' + this.accessToken;
    },
    
    /**
     * Authorizes and makes a GET request to the KoboToolbox API.
     */
    get: function(url) {
      var service = this.getService();
      if (service.hasAccess()) {
        var result = KoboGet_(url, 'Bearer ' + service.getAccessToken());
        //Logger.log(JSON.stringify(result, null, 2));
        return result;
      } else {
        var authorizationUrl = service.getAuthorizationUrl();
        //Logger.log('Open the following URL and re-run the script: %s', authorizationUrl);
        var template = HtmlService.createTemplate('<a href="<?= authorizationUrl ?>" target="_blank">Click here to authorize</a>. Reopen when the authorization is complete.');
        template.authorizationUrl = authorizationUrl;
        var page = template.evaluate();
        SpreadsheetApp.getUi().showModalDialog(page, 'Authorize');
      }
    },
    // TODO: still need to reorganize this to call again after authorization is done
    
    /**
     * Reset the authorization state, so that it can be re-tested.
     */
    reset: function() {
      var service = this.getService();
      service.reset();
    },
    
    /**
     * Configures the service.
     */
    getService: function() {
      return OAuth2.createService('KoboToolbox')
          // Set the endpoint URLs.
          .setAuthorizationBaseUrl(KOBO_BASE_URL + '/o/authorize')
          .setTokenUrl(KOBO_BASE_URL + '/o/token')
          .setTokenFormat(OAuth2.TOKEN_FORMAT.FORM_URL_ENCODED)
    
          // Set the client ID and secret.
          .setClientId(this.KOBO_CLIENT_ID)
          .setClientSecret(this.KOBO_CLIENT_SECRET)
    
          // Set the name of the callback function that should be invoked to complete
          // the OAuth flow.
          .setCallbackFunction('KoboOAuth2Callback')
    
          //.setTokenPayloadHandler(KoboOAuth2AddContentType)
    
          .setTokenHeaders({
            'Authorization': 'Basic ' + Utilities.base64Encode(this.KOBO_CLIENT_ID + ':' + this.KOBO_CLIENT_SECRET)
          })
    
          // Set the property store where authorized tokens should be persisted.
          .setPropertyStore(PropertiesService.getUserProperties())
    
          // Set the state (this will be passed to the redirect callback)
          //.setParam('state', '12345')
          
          // Set the response type to code (required).
          .setParam('response_type', 'code');
    }
  };
}

/**
 * Handles the OAuth callback.
 */
function KoboOAuth2Callback(request) {
  var service = KoboToolboxOAuth2.getService();
  var authorized = service.handleCallback(request);
  if (authorized) {
    return HtmlService.createHtmlOutput('Authorization success!');
  } else {
    return HtmlService.createHtmlOutput('Authorization failure!');
  }
}

/**
 * Adds content-type to the payload
 */
function KoboOAuth2AddContentType(payload) {
  //payload['Content-Type'] = 'application/x-www-form-urlencoded';
  return payload;
}