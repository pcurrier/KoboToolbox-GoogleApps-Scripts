var KoboToolboxToken;

/**
 * Token-based authentication for KoboToolbox
 */
function initKoboToolboxToken() {
  KoboToolboxToken = {
    KOBO_TOKEN: 'put your developer API token here',
    
    /**
     * Makes a GET request to the KoboToolbox API.
     */
    get: function(url) {
      var response = UrlFetchApp.fetch(url, {
        method: 'get',
        headers: {
          Authorization: 'Token ' + this.KOBO_TOKEN
        }
      });
      return JSON.parse(response.getContentText());
    }
  };
}