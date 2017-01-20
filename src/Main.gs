var KOBO_PK_FIELD = '_id';
var KOBO_BASE_URL = 'put your base URL here';
var KOBO_AUTHENTICATION_METHOD = 'token';

// Call all init* functions before we do anything else. This works around google's
// limitation that we cannot control the load order of the .gs files in the project,
// and ensures all files are loaded before we need them.
(function() {
  var keys = Object.keys(this);
  for (var i = 0; i < keys.length; i++) {
    var funcName = keys[i];
    if (funcName.indexOf("init") == 0) {
      this[funcName].call(this);
    }
  }
  KoboInit(KOBO_AUTHENTICATION_METHOD);
})();

// Initializes authentication method and creates Kobo menu
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('KoboToolbox')
      .addItem('Import KoboToolbox Data', 'importDataMenuItem')
      .addToUi();
}

// Creates import dialog box
function importDataMenuItem() {
  var template = HtmlService.createTemplateFromFile('ImportForm.html');
  var html = template.evaluate().setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(html, 'Import survey data from KoboToolbox');
}

// Called by the submit button on InputForm: imports one or more Kobo surveys into the specified sheet
function importData(sheetName, surveys) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var sheetMetadata = getSheetMetadata(sheet);
  if (!sheetMetadata) {
    return 'ERROR: Target sheet ' + sheetName + ' does not contain index field: ' + KOBO_PK_FIELD;
  }
  
  // Avoid multiple simultaneous imports
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  var returnString = '';
  var rowCount = 0;
  for (var i = 0; i < surveys.length; i++) {
    var survey = new Survey(surveys[i]['id']);
    var rowsImported = survey.import(sheet, sheetMetadata);
    if (rowsImported < 0) {
      returnString = 'ERROR: Survey ' + surveys[i]['name'] + ' could not be imported into sheet ' + sheetName + '. Check that sheet and survey have identical field structures.';
      break;
    }
    rowCount += rowsImported;
  }
  
  if (!returnString) {
    returnString = 'Imported ' + surveys.length + ' survey(s) containing ' + rowCount + ' new rows.';
  }
  SpreadsheetApp.flush();
  lock.releaseLock();
  return returnString;
}

// Gets metadata (field info and primary key index, mainly) for a sheet
function getSheetMetadata(sheet) {
  var metadata = { 'fields': [], 'pkValues': {} };
  if (sheet.getLastColumn() == 0) {
    return metadata;
  }
  
  var headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  metadata['fields'] = headerRow.getValues()[0];
  metadata['pkIdx'] = metadata['fields'].indexOf(KOBO_PK_FIELD);
  if (metadata['pkIdx'] < 0) {
    return null;
  }
  
  // Build an index on the pk field, used to determine if new rows are already present
  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();
  for (var i = 1; i < values.length; i++) {
    metadata['pkValues'][values[i][metadata['pkIdx']]] = 1;
  }
  return metadata;
}

// Returns a list of sheet names
function getSheets() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets().map(function(s){ return s.getName(); });
}