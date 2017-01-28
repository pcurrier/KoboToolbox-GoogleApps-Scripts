var KoboToolboxBasic;

/**
 * Token-based authentication for KoboToolbox
 */
function initKoboToolboxBasic() {
  KoboToolboxBasic = {
    KOBO_USER: 'put your username here',
    KOBO_PASSWORD: 'put your password here',
    
    /**
     * Returns the authorization string for this auth method.
     */
    getAuthString: function() {
      return 'Basic ' + Utilities.base64Encode(this.KOBO_USER + ':' + this.KOBO_PASSWORD);
    },
    
    /**
     * Makes a GET request to the KoboToolbox API.
     */
    get: function(url) {
      return KoboGet_(url, this.getAuthString());
    }
  };
}