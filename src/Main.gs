var KOBO_PK_FIELD = '_id';

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
})();

// Setup and menu creation
function KoboSetup(config) {
  PropertiesService.getDocumentProperties().setProperties(config);
  
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('KoboToolbox');
  if (config.showImportMenu) {
    menu.addItem('Import KoboToolbox Data into Sheet', 'importDataMenuItem');
  }
  if (config.showUploadMenu) {
    menu.addItem('Upload Sheet Data to KoboToolbox Survey', 'uploadDataMenuItem');
  }
  menu.addToUi();
}

// Creates import dialog box
function importDataMenuItem() {
  var template = populateTemplateSheets(populateTemplateSurveys(HtmlService.createTemplateFromFile('ImportForm.html')));
  var html = template.evaluate().setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(html, 'Import survey data from KoboToolbox');
}

// Creates upload dialog box
function uploadDataMenuItem() {
  var template = populateTemplateSheets(populateTemplateSurveys(HtmlService.createTemplateFromFile('UploadForm.html')));
  var html = template.evaluate();
  SpreadsheetApp.getUi().showModalDialog(html, 'Upload Sheet Data to KoboToolbox');
}

// Pushes sheet list onto a template
function populateTemplateSheets(template) {
  var ss = function(s){ return { name: s.getName(), isActive: s.getName() == SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getName() }; };
  template.sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets().map(ss);
  return template;
}

// Pushes survey list onto a template
function populateTemplateSurveys(template) {
  var config = PropertiesService.getDocumentProperties().getProperties();
  var surveyList = KoboGet(config.baseUrl + '/api/v1/data');
  template.surveys = surveyList.map(function(s){ return { 'id': s['id'], 'name': s['title'], 'url': s['url'] }; });
  return template;
}

// Gets the name of the primary key field
function getPk(config) {
  if (config.pkField) {
    return config.pkField;
  }
  return KOBO_PK_FIELD;
}

// Called by the submit button on InputForm: imports one or more Kobo surveys into the specified sheet
function importData(sheetName, surveys) {
  var config = PropertiesService.getDocumentProperties().getProperties();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var sheetMetadata = getSheetMetadata(sheet, config);
  if (!sheetMetadata) {
    return 'ERROR: Target sheet ' + sheetName + ' does not contain index field: ' + getPk(config);
  }
  
  // Avoid multiple simultaneous imports
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  
  var returnString = '';
  var rowCount = 0;
  for (var i = 0; i < surveys.length; i++) {
    var survey = new Survey(surveys[i]['id'], config.baseUrl, getPk(config));
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

// Called by the submit button on UploadForm: uploads a sheet's data into the specified survey
function uploadData(sheetName, surveyId) {
  var config = PropertiesService.getDocumentProperties().getProperties();
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var sheetMetadata = getSheetMetadata(sheet, config);
  if (!sheetMetadata) {
    return 'ERROR: Target sheet ' + sheetName + ' does not contain index field: ' + getPk(config);
  }
  
  var returnString = '';
  var rowCount = 0;
  var survey = new Survey(surveyId, config.baseUrl, getPk(config));
  var rowsUploaded = survey.upload(sheet, sheetMetadata);
  if (rowsUploaded < 0) {
    returnString = 'ERROR: Sheet ' + sheetName + ' could not be uploaded into survey ' + surveyId + '. Check that sheet and survey have identical field structures.';
  }
  rowCount += rowsUploaded;
  
  if (!returnString) {
    returnString = 'Uploaded sheet containing ' + rowCount + ' new rows.';
  }
  return returnString;
}

// Gets metadata (field info and primary key index, mainly) for a sheet
function getSheetMetadata(sheet, config) {
  var metadata = { 'fields': [], 'pkValues': {} };
  if (sheet.getLastColumn() == 0) {
    return metadata;
  }
  
  metadata['fields'] = getHeaderFields(sheet);
  metadata['pkIdx'] = metadata['fields'].indexOf(getPk(config));
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

// Gets an array of the header field names
function getHeaderFields(sheet) {
  var headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  return headerRow.getValues()[0];
}