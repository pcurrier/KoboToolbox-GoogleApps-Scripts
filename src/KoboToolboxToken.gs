var KOBO_TOKEN;

var KoboToolboxToken;

/**
 * Token-based authentication for KoboToolbox
 */
function initKoboToolboxToken() {
  KOBO_TOKEN = 'put your developer API token here';
  
  KoboToolboxToken = {    
    /**
     * Makes a GET request to the KoboToolbox API.
     */
    get: function(url) {
      var response = UrlFetchApp.fetch(url, {
        method: 'get',
        headers: {
          Authorization: 'Token ' + KOBO_TOKEN
        }
      });
      return JSON.parse(response.getContentText());
    }
  };
}