var KoboToolboxBasic;

/**
 * Token-based authentication for KoboToolbox
 */
function initKoboToolboxBasic() {
  KoboToolboxBasic = {
    KOBO_USER: 'put your username here',
    KOBO_PASSWORD: 'put your password here',
    
    /**
     * Makes a GET request to the KoboToolbox API.
     */
    get: function(url) {
      var response = UrlFetchApp.fetch(url, {
        method: 'get',
        headers: {
          Authorization: 'Basic ' + Utilities.base64Encode(this.KOBO_USER + ':' + this.KOBO_PASSWORD)
        }
      });
      return JSON.parse(response.getContentText());
    }
  };
}