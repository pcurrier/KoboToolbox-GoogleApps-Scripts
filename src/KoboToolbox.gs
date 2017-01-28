// Wraps different methods for authenticating with KoboToolbox

var KoboToolbox;

function KoboInit(authType) {
  if (authType == 'token') {
    KoboToolbox = KoboToolboxToken;
  } else if (authType == 'oauth2') {
    KoboToolbox = KoboToolboxOAuth2;
  } else if (authType == 'basic') {
    KoboToolbox = KoboToolboxBasic;
  }
}

function KoboGet(url) {
  return KoboToolbox.get(url);
}