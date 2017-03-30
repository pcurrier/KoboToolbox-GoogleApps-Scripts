# KoboToolbox-GoogleApps-Scripts

This project demonstrates how to set up a Google Spreadsheet to sync data with KoboToolbox using the Kobo API. Data can be copied in both directions: Google sheet -> Kobo survey, and Kobo survey -> Google sheet.

Disclaimer: this project is still being tested and should be considered experimental.

## Known Issues

1. Support for OAuth2 authentication is not finished yet.

## Installation

1. Copy all files in the src/ folder into a Google Apps Script project that is attached to a Google sheet (you do not need to edit these files)
2. Copy the file demo/Code.gs into the project
3. Edit the baseUrl configuration parameter in Code.gs, setting it to either:
   * Humanitarian organizations: `https://kc.humanitarianresponse.info`
   * Everyone else: `https://kc.kobotoolbox.org`
4. Pick an authentication method and follow the appropriate steps below. There are two available:
   * Token-based authentication
   * Basic authentication (not recommended, better to use token-based)

The developer API token (or the username/password if you choose basic authentication) is hard-coded in Code.gs for the purposes of this demo. In production code, you would probably want to obtain the value in some other way (e.g. prompt the user for it).

### Token-based authentication

1. Make sure the token authentication example is uncommented in Code.gs (this is the default setup); the other examples should be commented out
2. Log into your KoboToolbox account, then go to `KOBO_BASE_URL/<username>/api-token`
3. Copy the developer API token, then paste it into the value of the authToken configuration parameter in Code.gs

### Basic authentication

1. Make sure the basic authentication example is uncommented in Code.gs; the other examples should be commented out
2. Edit the configuration parameters authUser and authPassword, setting them to your username and password

## Importing Kobo survey data into a Google sheet

1. Reload your google sheets document
2. If the document does not have any empty sheets, add one
3. In the KoboToolbox menu, select "Import KoboToolbox Data into Sheet"
4. Check one or more surveys to import (all selected surveys must have the same field structure or you will get an error)
5. In the sheet dropdown menu, select one of the empty sheets in your document
6. Click import

The result should be a sheet with the same data as would appear in an Excel file exported from that KoboToolbox survey.

Once you have a sheet that contains survey data, you can run this procedure again to re-import surveys, and only rows that don't yet exist in the sheet will be imported. The `_id` field is used as the unique row identifier; to change this, you can edit the value of KOBO_PK_FIELD. If you ever try to import a survey with different fields than exist in your chosen sheet (based on the sheet's header row), you will get an error.

This script works for all form datatypes that I've encountered in the surveys I have access to; however there are probably other datatypes for which support will need to be added.

## Uploading Google sheet data to a Kobo survey

1. Reload your google sheets document
2. In the KoboToolbox menu, select "Upload Sheet Data to KoboToolbox Survey"
3. In the sheet dropdown menu, select the sheet you want to upload
4. In the survey dropdown menu, select the survey you want to load (the sheet must have the same field structure as the survey or you will get an error)
5. Click upload

NOTE: if you run the upload multiple times using the same sheet/survey, you will load duplicate data into the survey. This is because the upload API ignores the `_id` field (and generates a new value for each row), so there is no effective way to avoid duplicates. Eventually if the API supports PUT operations on individual rows, perhaps this behavior could be improved.

## Copying data from one Kobo survey to another

1. Using the import steps above, import a survey into a sheet
2. Optionally modify the data in the sheet. If your survey in step 3 has different fields, you can also alter the sheet's field structure to match the survey
3. Using the upload steps above, upload the sheet into another survey

## Using OAuth2

Support for OAuth2 is a work in progress. (Current issue is that the token POST request made after the redirect returns a 405 rather than an access token.) I haven't gotten around to finishing this, but if you feel like playing around with it, you will need to do the following setup:

1. Make sure the OAuth2 authentication example is uncommented in Code.gs; the other examples should be commented out
2. In your google script project:
   * In Resources->Libraries, find library 1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF (this is the Oauth2 library), and add the latest version
   * In File->Project Properties, copy the value of SCRIPT_ID, which will be used below
3. Go to `KOBO_BASE_URL/o/applications/register/` to register your script and fill in the fields as follows:
   * Name: choose any unique application name
   * Client type: Confidential
   * Authorization grant type: Authorization code
   * Redirect URIs: `https://script.google.com/macros/d/<SCRIPT_ID>/usercallback`
4. After registering the script, copy the values of the KOBO_CLIENT_ID and KOBO_CLIENT_SECRET, and paste them into the values of authClientId and authClientSecret in Code.gs
