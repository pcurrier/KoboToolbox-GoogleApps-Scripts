var KoboToolboxToken;

/**
 * Token-based authentication for KoboToolbox
 */
function initKoboToolboxToken() {
  KoboToolboxToken = {
    KOBO_TOKEN: 'put your developer API token here',
    
    /**
     * Returns the authorization string for this auth method.
     */
    getAuthString: function() {
      return 'Token ' + this.KOBO_TOKEN;
    },
    
    /**
     * Makes a GET request to the KoboToolbox API.
     */
    get: function(url) {
      return KoboGet_(url, this.getAuthString());
    }
  };
}