// Example for token authentication
function onOpen() {
  KoboSetup({
    baseUrl: 'https://kc.humanitarianresponse.info',
    authMethod: 'token',
    authToken: 'put your developer API token here'
  });
}

/*
// Example for basic authentication
function onOpen() {
  KoboSetup({
    baseUrl: 'https://kc.humanitarianresponse.info',
    authMethod: 'basic',
    authUser: 'put your username here',
    authPassword: 'put your password here'
  });
}
*/

/*
// Example for OAuth2 authentication -- not working yet
function onOpen() {
  KoboSetup({
    baseUrl: 'https://kc.humanitarianresponse.info',
    authMethod: 'oauth2',
    authClientId: 'put your client_id here',
    authClientSecret: 'put your client_secret here'
  });
}
*/