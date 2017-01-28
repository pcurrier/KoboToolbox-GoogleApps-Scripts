# KoboToolbox-GoogleApps-Scripts

This project demonstrates how to set up a Google Spreadsheet to pull data directly from KoboToolbox using the Kobo API. The demo code populates a sheet in the spreadsheet with data that should exactly match the contents of an Excel file exported from KoboToolbox.

## Known Issues

1. Support for OAuth2 authentication is not finished yet.

## Installation

1. Copy all files in the src/ folder into a Google Apps Script project that is attached to a Google sheet
2. Edit KOBO_BASE_URL in Main.gs, setting it to either:
  * Humanitarian organizations: `https://kc.humanitarianresponse.info`
  * Everyone else: `https://kc.kobotoolbox.org`
3. Pick an authentication method:
  * Token-based authentication: Log into your KoboToolbox account, then go to `KOBO_BASE_URL/<username>/api-token` and copy the developer API token, then paste it into the value of KOBO_TOKEN in KoboToolboxToken.gs
  * Basic authentication: edit the values of KOBO_USER/KOBO_PASSWORD in KoboToolboxBasic.gs (not recommended, better to use token-based)
  * Set KOBO_AUTHENTICATION_METHOD in Main.gs to "token" or "basic" depending on your choice

## Running the Script

1. Reload your google sheets document
2. If the document does not have any empty sheets, add one
3. In the KoboToolbox menu, select "Import KoboToolbox Data"
4. Check one or more surveys to import (all selected surveys must have the same field structure or you will get an error)
5. In the sheet dropdown menu, select one of the empty sheets in your document
6. Click import

The end result should be a sheet with the same data as would appear in an Excel file exported from KoboToolbox.

Once you have a sheet that contains survey data, you can run this procedure again to re-import the surveys, and only rows that don't yet exist in the sheet will be imported. The `_id` field is used as the unique row identifier; to change this, you can edit the value of KOBO_PK_FIELD.

The developer API token (or the username/password if you choose basic authentication) is hard-coded in a script file for the purposes of this demo. In production code, you would probably want to obtain the value in some other way (e.g. prompt the user for it).

This script works for all form datatypes that I've encountered in the surveys I have access to; however there are probably other datatypes for which support will need to be added.

## Using OAuth2

Support for OAuth2 is a work in progress. (Current issue is that the token POST request made after the redirect returns a 405 rather than an access token.) I haven't gotten around to finishing this, but if you feel like playing around with it, you will need to do the following setup:

1. Edit KOBO_AUTHENTICATION_METHOD in Main.gs, setting it to "oauth2"
1. In your google script project:
  * In Resources->Libraries, find library 1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF (this is the Oauth2 library), and add the latest version
  * In File->Project Properties, copy the value of SCRIPT_ID, which will be used below
2. Go to `KOBO_BASE_URL/o/applications/register/` to register your script and fill in the fields as follows:
  * Name: choose any unique application name
  * Client type: Confidential
  * Authorization grant type: Authorization code
  * Redirect URIs: `https://script.google.com/macros/d/<SCRIPT_ID>/usercallback`
3. After registering the script, copy the values of the KOBO_CLIENT_ID and KOBO_CLIENT_SECRET, and paste them into KoboToolboxOAuth2.gs
