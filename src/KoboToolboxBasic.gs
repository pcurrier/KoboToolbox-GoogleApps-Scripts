var KoboToolboxBasic;

/**
 * Basic authentication for KoboToolbox
 */
function initKoboToolboxBasic() {
  KoboToolboxBasic = {
    /**
     * Initializes the object.
     */
    init: function(config) {
      this.config = config;
      return this;
    },
    
    /**
     * Returns the authorization string for this auth method.
     */
    getAuthString: function() {
      return 'Basic ' + Utilities.base64Encode(this.config.authUser + ':' + this.config.authPassword);
    },
    
    /**
     * Makes a GET request to the KoboToolbox API.
     */
    get: function(url) {
      return KoboGet_(url, this.getAuthString());
    }
  };
}