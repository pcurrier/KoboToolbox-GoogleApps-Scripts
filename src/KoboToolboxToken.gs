var KoboToolboxToken;

/**
 * Token-based authentication for KoboToolbox
 */
function initKoboToolboxToken() {
  KoboToolboxToken = {
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
      return 'Token ' + this.config.authToken;
    },
    
    /**
     * Makes a GET request to the KoboToolbox API.
     */
    get: function(url) {
      return KoboGet_(url, this.getAuthString());
    }
  };
}