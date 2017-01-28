function initSurvey() {
}

// Constructor for Survey class
function Survey(surveyId) {
  this.id = surveyId;
  this.fields = [];
  this.fieldIndex = {};
  this.data = [];
  this.getMetadata();
}

Survey.prototype = {
  // Import this survey's data into the provided sheet
  import: function(sheet, sheetMetadata) {
    if (!this.matchesSheet(sheetMetadata)) {
      return -1;
    }
    
    // Add header row if sheet is empty
    if (sheetMetadata.fields.length == 0) {
      sheet.appendRow(this.fields.map(function(x){ return x['name']; }));
    }
    
    var stringFormats = [[]];
    var slen = this.fields.length;
    for (var i = 0; i < slen; i++) {
      stringFormats[0].push("@STRING@");
    }
    
    var count = 0;
    var currentRow = sheet.getLastRow() + 1;
    var sdlen = this.getData();
    for (var i = 0; i < sdlen; i++) {
      if (!this.surveyRowExistsInSheet(sheetMetadata, this.data[i])) {
        var newRow = this.surveyRowToSheetRow(this.data[i]);
        var newRange = sheet.getRange(currentRow++, 1, 1, newRow.length);
        newRange.setNumberFormats(stringFormats);
        newRange.setValues([newRow]);
        count++;
      }
    }
    return count;
  },
  
  // Upload a sheet's data to the survey
  upload: function(sheet, sheetMetadata) {
    if (!this.matchesSheet(sheetMetadata)) {
      return -1;
    }
        
    // Add header row
    var csvData = this.fields.map(function(x){ return '"' + x['name'] + '"'; }).join(',') + "\r\n";
    
    var dataValues = sheet.getDataRange().getValues();
    var numRows = dataValues.length;
    for (var i = 1; i < numRows; i++) {
      var row = '';
      var numCols = dataValues[i].length;
      for (var j = 0; j < numCols; j++) {
        if (j > 0) {
          row += ',';
        }
        row += '"' + dataValues[i][j] + '"';
      }
      row += "\r\n";
      csvData += row;
    }
    
    var count = 0;
    var response = KoboUpload(KOBO_BASE_URL + '/api/v1/forms/' + this.id + '/csv_import', csvData);
    if (response['additions']) {
      count = response['additions'];
    }
    
    return count;
  },
  
  // Takes the JSON survey row representation and creates an array representation for the google sheet
  surveyRowToSheetRow: function(jsonRow) {
    var row = [];
    var fields = this.fields;
    var flen = fields.length;
    for (var i = 0; i < flen; i++) {
      if (jsonRow[fields[i]['name']]) {
        row.push(jsonRow[fields[i]['name']]);
      } else {
        row.push('');
      }
      if (fields[i]['function']) {
        fields[i]['function'](jsonRow, jsonRow[fields[i]['name']]);
      }
    }
    return row;
  },
  
  // Check if an incoming survey row already exists in the sheet
  surveyRowExistsInSheet: function(sheetMetadata, jsonRow) {
    return jsonRow[KOBO_PK_FIELD] in sheetMetadata['pkValues'];
  },
  
  // Gets metadata (field list, etc) for a survey.
  // The goal is to have the same fields as we would see in an Excel file export.
  getMetadata: function() {
    var formInfo = KoboGet(KOBO_BASE_URL + '/api/v1/forms/' + this.id + '/form.json');
    this.title = formInfo['title'];
    this.version = formInfo['version'];
    
    var fieldCtr = 0, len = formInfo['children'].length;
    for (var c = 0; c < len; c++) {
      var child = formInfo['children'][c];
      if (child['type'] == 'group' && child['name'] == 'meta') {
        // Fix up the last few fields to match the last fields from XLS export
        this.pushField('_id', fieldCtr++);
        this.pushField('_uuid', fieldCtr++);
        this.pushField('_submission_time', fieldCtr++);
        this.pushField('_index', fieldCtr++);
      } else if (['integer','text','date','select one','photo'].indexOf(child['type']) >= 0) {
        // regular scalar values
        this.pushField(child['name'], fieldCtr++);
      } else if (['start','end','username','__version__'].indexOf(child['name']) >= 0) {
        // special internal fields
        this.pushField(child['name'], fieldCtr++);
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
        this.pushField(child['name'], fieldCtr++, gpsFunc);
        this.pushField(gpslat, fieldCtr++);
        this.pushField(gpslon, fieldCtr++);
        this.pushField(gpsalt, fieldCtr++);
        this.pushField(gpsprec, fieldCtr++);
      } else if (child['type'] == 'group') {
        // expands to members of the group
        var ccl = child['children'].length;
        for (var cc = 0; cc < ccl; cc++) {
          this.pushField(child['name'] + '/' + child['children'][cc]['name'], fieldCtr++);
        }
      } else if (child['type'] == 'select all that apply') {
        // expands to parent plus children
        var parentName = child['name'];
        var childNames = [];
        var ccl = child['children'].length;
        for (var cc = 0; cc < ccl; cc++) {
          childNames.push(child['children'][cc]['name']);
        }
        this.pushField(parentName, fieldCtr++, makeSelectAllFunc(parentName, ccl, childNames));
        for (var cc = 0; cc < ccl; cc++) {
          this.pushField(parentName + '/' + child['children'][cc]['name'], fieldCtr++);
        }
      }
    }
  },
  
  // Adds a field to the field list
  pushField: function(name, idx, func) {
    var fld = { 'name': name, 'index': idx };
    if (func) {
      fld['function'] = func;
    }
    this.fields.push(fld);
    this.fieldIndex[name] = idx;
  },
  
  // Get the survey response data
  getData: function() {
    this.data = KoboGet(KOBO_BASE_URL + '/api/v1/data/' + this.id);
    return this.data.length;
  },
  
  // Checks that the field lists for sheet and survey match
  matchesSheet: function(sheetMetadata) {
    return sheetMetadata['fields'].length == 0 ||
           sheetMetadata['fields'].join('|') == this.fields.map(function(elem) { return elem.name; }).join('|');
  },
};

// Returns closure for getting child values from "select all that apply" field
function makeSelectAllFunc(parentName, childCount, childNames) {
  return function(jsonRow, jsonValue) {
    var splitVals = [];
    if (jsonValue) {
      splitVals = jsonValue.split(' ');
    }
    for (var i = 0; i < childCount; i++) {
      jsonRow[parentName + '/' + childNames[i]] = (splitVals.indexOf(childNames[i]) >= 0) ? '1' : '0';
    }
  };
}

// Gets all the surveys we have defined in our Kobo account
function getSurveys() {
  var surveys = KoboGet(KOBO_BASE_URL + '/api/v1/data');
  return surveys.map(function(s){ return { 'id': s['id'], 'name': s['title'], 'url': s['url'] }; });
}