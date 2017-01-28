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

function KoboUpload(url, csvData) {
  var boundary = "labnol";
  var csvBlob = Utilities.newBlob(csvData);
    
  var requestBody = Utilities.newBlob(
    "--" + boundary + "\r\n"
    + "Content-Disposition: form-data; name=\"csv_file\"; filename=\"" + csvBlob.getName() + "\"\r\n"
    + "Content-Type: " + csvBlob.getContentType() + "\r\n\r\n").getBytes()
  .concat(csvBlob.getBytes())
  .concat(Utilities.newBlob("\r\n--" + boundary + "--\r\n").getBytes());
  
  var options = {
    method: "post",
    contentType: "multipart/form-data; boundary=" + boundary,
    payload: requestBody,
    muteHttpExceptions: true,
    headers: {
      Authorization: KoboToolbox.getAuthString()
    }
  };
  
  var response = KoboFetch_(url, options);
  return response;
}

function KoboGet_(url, authString) {
  return KoboFetch_(url, {
        method: 'get',
        headers: {
          Authorization: authString
        }
  });
}

function KoboFetch_(url, options) {
  var response = UrlFetchApp.fetch(url, options);
  return JSON.parse(response.getContentText());
}