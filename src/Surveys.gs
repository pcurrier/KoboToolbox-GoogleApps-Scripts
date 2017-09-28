function initSurvey() {
}

// Constructor for FieldSet class
function FieldSet(sheetName, parent) {
  this.fields = [];
  this.fieldIndex = {};
  this.stringFormats = null;
  
  this.childFieldSets = [];
  
  this.parent = parent;
  this.baseSheetName = sheetName;
  this.sheet = null;
  this.sheetName = null;
  this.currentSheetRow = -1;
  this.stringFormats = [];
  this.sheetMetadata = null;
  
  this.currentJSONRow = 0;
}

FieldSet.prototype = {
  // Adds a field to the field list
  pushField: function(name, func) {
    var idx = this.fields.length;
    var fld = { 'name': name, 'index': idx };
    if (func) {
      fld['function'] = func;
    }
    this.fields.push(fld);
    this.fieldIndex[name] = idx;
  },
  
  // Adds a fieldSet to the child list
  pushFieldSet: function(name, fieldSet) {
    var idx = this.childFieldSets.length;
    var fld = { 'name': name, 'index': idx, 'fieldSet': fieldSet };
    this.childFieldSets.push(fld);
  },
  
  // Gets metadata (field list, etc) for one level of a survey, and sets up target sheet.
  // The goal is to have the same fields as we would see in an Excel file export.
  setupSheet: function(sheetName, formInfo, namePrefix, depth, doCheck, isUpload) {
    this.sheetName = sheetName;
    this.sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (this.sheet == null) {  // create sheet if it does not exist
      if (depth == 0) {
        return 'Invalid sheet name: ' + sheetName;
      }
      this.sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(this.parent.sheet.getIndex());
      this.sheet.setName(sheetName);
    }
    this.currentSheetRow = this.sheet.getLastRow() + 1;
    this.sheetMetadata = getSheetMetadata(this.sheet);
    
    var that = this;
    var idxFunc = function(jsonRow, jsonValue) {
      jsonRow['_index'] = ++that.currentJSONRow;
    };
    
    var len = formInfo.length;
    for (var c = 0; c < len; c++) {
      var child = formInfo[c];
      if (child['type'] == 'group' && child['name'] == 'meta') {
        // Fix up the last few fields to match the last fields from XLS export
        this.pushField('_id');
        this.pushField('_uuid');
        this.pushField('_submission_time');
        this.pushField('_index', idxFunc);
      } else if (['start','end','today','deviceid','username'].indexOf(child['type']) >= 0) {
        // special internal fields
        this.pushField(child['name']);
      } else if (['__version__'].indexOf(child['name']) >= 0) {
        // special internal fields
        this.pushField(child['name']);
      } else if (['integer','decimal','text','date','select one','photo','barcode','note','calculate'].indexOf(child['type']) >= 0) {
        // regular scalar values
        this.pushField(namePrefix + child['name']);
      } else if (child['type'] == 'geopoint') {
        // GPS point: expands to 5 fields: GPS,lat,lon,altitude,precision
        var gpslat = '_' + child['name'] + '_latitude';
        var gpslon = '_' + child['name'] + '_longitude';
        var gpsalt = '_' + child['name'] + '_altitude';
        var gpsprec = '_' + child['name'] + '_precision';
        var gpsFunc = function(jsonRow, jsonValue) {
          var vals = ['', '', '', ''];
          if (jsonValue) {
            var splitvals = jsonValue.split(' ');
            if (splitvals.length == 4) {
              vals = splitvals;
            }
          }
          jsonRow[gpslat] = vals[0];
          jsonRow[gpslon] = vals[1];
          jsonRow[gpsalt] = vals[2];
          jsonRow[gpsprec] = vals[3];
        };
        this.pushField(namePrefix + child['name'], gpsFunc);
        this.pushField(namePrefix + gpslat);
        this.pushField(namePrefix + gpslon);
        this.pushField(namePrefix + gpsalt);
        this.pushField(namePrefix + gpsprec);
      } else if (child['type'] == 'group') {
        // recurse into the group's children, using the same fieldset
        var error = this.setupSheet(sheetName, child['children'], namePrefix + child['name'] + '/', depth, false, isUpload);
        if (error) {
          return error;
        }
      } else if (child['type'] == 'repeat') {
        if (isUpload) {
          return 'Cannot upload surveys with repeated groups.';
        }
        // recurse into the group's children, using a new fieldset
        var newFieldSet = new FieldSet(this.baseSheetName, this);
        this.pushFieldSet(namePrefix + child['name'], newFieldSet);
        var error = newFieldSet.setupSheet(this.baseSheetName + '/' + child['name'], child['children'], namePrefix + child['name'] + '/', depth + 1, true, isUpload);
        if (error) {
          return error;
        }
      } else if (child['type'] == 'select all that apply') {
        // expands to parent plus children
        var parentName = child['name'];
        var childNames = [];
        var ccl = child['children'].length;
        for (var cc = 0; cc < ccl; cc++) {
          childNames.push(child['children'][cc]['name']);
        }
        this.pushField(namePrefix + parentName, this.makeSelectAllFunc(parentName, ccl, childNames));
        for (var cc = 0; cc < ccl; cc++) {
          this.pushField(namePrefix + parentName + '/' + child['children'][cc]['name']);
        }
      }
      // Add last fields for nested groups
      if (depth > 0 && c == (len - 1)) {
        this.pushField('_index', idxFunc);
        var parentFunc = function(jsonRow, jsonValue) {
          jsonRow['_parent_table_name'] = that.parent.sheetName;
        };
        this.pushField('_parent_table_name', parentFunc);
        var parentIdxFunc = function(jsonRow, jsonValue) {
          jsonRow['_parent_index'] = that.parent.currentJSONRow;
        };
        this.pushField('_parent_index', parentIdxFunc);
      }
    }
    
    if (doCheck) {
      if (!this.matchesSheet(this.sheetMetadata)) {
        return 'Sheet ' + sheetName + ' has a field structure that does not match the Kobo survey. Either adjust the field structure of the sheet, or clear all data in the sheet.';
      }
      
      // Add header row if sheet is empty
      if (this.sheetMetadata.fields.length == 0) {
        this.sheet.appendRow(this.fields.map(function(x){ return x['name']; }));
        this.currentSheetRow++;
      }    
      
      this.stringFormats = [[]];
      var slen = this.fields.length;
      for (var i = 0; i < slen; i++) {
        this.stringFormats[0].push("@STRING@");
      }
    }
    
    return '';
  },
  
  // Returns closure for getting child values from "select all that apply" field
  makeSelectAllFunc: function(parentName, childCount, childNames) {
    return function(jsonRow, jsonValue) {
      var splitVals = [];
      if (jsonValue) {
        splitVals = jsonValue.split(' ');
      }
      for (var i = 0; i < childCount; i++) {
        jsonRow[parentName + '/' + childNames[i]] = (splitVals.indexOf(childNames[i]) >= 0) ? '1' : '0';
      }
    };
  },
  
  // Recursively writes a row to the appropriate sheet(s)
  writeRow: function(jsonRow) {
    var newRow = this.surveyRowToSheetRows(jsonRow);
    var newRange = this.sheet.getRange(this.currentSheetRow++, 1, 1, newRow.length);
    newRange.setNumberFormats(this.stringFormats);
    newRange.setValues([newRow]);
    for (var c = 0; c < this.childFieldSets.length; c++) {
      var childRows = jsonRow[this.childFieldSets[c]['name']];
      if (childRows) {
        for (var cc = 0; cc < childRows.length; cc++) {
          this.childFieldSets[c]['fieldSet'].writeRow(childRows[cc]);
        }
      }
    }
  },
  
  // Takes the JSON survey row representation and creates an array representation for the google sheet
  surveyRowToSheetRows: function(jsonRow) {
    var row = [];
    var flen = this.fields.length;
    for (var i = 0; i < flen; i++) {
      if (this.fields[i]['function']) {
        this.fields[i]['function'](jsonRow, jsonRow[this.fields[i]['name']]);
      }
      if (jsonRow[this.fields[i]['name']]) {
        row.push(jsonRow[this.fields[i]['name']]);
      } else {
        row.push('');
      }
    }
    return row;
  },
  
  // Checks that the field lists for sheet and survey match
  matchesSheet: function(sheetMetadata) {
    //var m = Math.max(sheetMetadata['fields'].length, this.fields.length);
    //for (var i = 0; i < m; i++) {
    //  if (sheetMetadata['fields'][i] !== this.fields[i]['name']) {
    //    Logger.log('Fields differ in position ' + i + ': ' + sheetMetadata['fields'][i] + ', ' + this.fields[i]['name']);
    //  }
    //}
    return sheetMetadata['fields'].length == 0 ||
           sheetMetadata['fields'].join('|') == this.fields.map(function(elem) { return elem.name; }).join('|');
  },
};

// Constructor for Survey class
function Survey(surveyId, sheetName, baseUrl, pkField) {
  this.id = surveyId;
  this.baseUrl = baseUrl;
  this.pkField = pkField;
  this.fieldSet = new FieldSet(sheetName, null);
  this.jsonData = [];
  
  this.formInfo = KoboGet(this.baseUrl + '/api/v1/forms/' + this.id + '/form.json');
  this.title = this.formInfo['title'];
  this.version = this.formInfo['version'];
}

Survey.prototype = {
  // Import this survey's data into the provided sheet
  import: function(sheetName) {
    var error = this.fieldSet.setupSheet(sheetName, this.formInfo['children'], '', 0, true, false);
    if (error) {
      return { 'error': error };
    }
    
    var count = 0;
    var sdlen = this.fetchData();
    for (var i = 0; i < sdlen; i++) {
      this.fieldSet.writeRow(this.jsonData[i]);
      count++;
    }
    return { rows: count };
  },
  
  // Upload a sheet's data to the survey
  upload: function(sheetName) {
    var error = this.fieldSet.setupSheet(sheetName, this.formInfo['children'], '', 0, true, true);
    if (error) {
      return { 'error': error };
    }
    if (this.fieldSet.sheetMetadata['fields'].indexOf(this.pkField) < 0) {
      return 'Upload sheet does not contain pk field';
    }
    
    var regex = /"/g;
    var quote = function(s) { return '"' + s.replace(regex, '""') + '"'; };
    
    // Add header row
    var csvData = this.fieldSet.fields.map(function(x){ return quote(x['name']); }).join(',') + "\r\n";
    
    var dataValues = this.fieldSet.sheet.getDataRange().getValues();
    var numRows = dataValues.length;
    for (var i = 1; i < numRows; i++) {
      var row = '';
      var numCols = dataValues[i].length;
      for (var j = 0; j < numCols; j++) {
        if (j > 0) {
          row += ',';
        }
        row += quote(dataValues[i][j].toString());
      }
      row += "\r\n";
      csvData += row;
    }
    
    var response = KoboUpload(this.baseUrl + '/api/v1/forms/' + this.id + '/csv_import', csvData);
    return response;
  },
  
  // Get the survey response data
  fetchData: function() {
    this.jsonData = KoboGet(this.baseUrl + '/api/v1/data/' + this.id);
    return this.jsonData.length;
  },
};