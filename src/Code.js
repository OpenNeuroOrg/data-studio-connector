function getAuthType() {
  var response = { type: 'NONE' };
  return response;
}

function getConfig(request) {
  var config = {
    configParams: [],
    dateRangeRequired: true
  };
  return config;
}

var onSchema = [
  {
    name: 'created_date',
    dataType: 'STRING',
    semantics: {
      conceptType: 'DIMENSION',
      semanticType: 'YEAR_MONTH_DAY',
      isReaggregatable: true
    }
  },
  {
    name: 'n_participants',
    dataType: 'NUMBER',
    semantics: {
      conceptType: 'METRIC',
      semanticType: 'NUMBER'
    }
  }
];

function getSchema(request) {
  return { schema: onSchema };
}

function getData(request) {
  // Create schema for requested fields
  var requestedSchema = request.fields.map(function (field) {
    for (var i = 0; i < onSchema.length; i++) {
      if (onSchema[i].name === field.name) {
        return onSchema[i];
      }
    }
  });

  
  // Fetch and parse data from API
  var url = 'https://openneuro.org/crn/graphql';

  var query = "{\n" +
    "  datasets {\n" +
    "    created\n" +
    "    draft {\n" +
    "      summary {\n" +
    "        subjects\n" +
    "      }\n" +
    "    }\n" +
    "  }\n" +
    "}";
  var payload = { 'query': query }
// Because payload is a JavaScript object, it will be interpreted as
// as form data. (No need to specify contentType; it will automatically
// default to either 'application/x-www-form-urlencoded'
// or 'multipart/form-data')
  var options = {
    'method' : 'post',
    'payload' : payload
  };
  var response = UrlFetchApp.fetch(url, options);
  var parsedResponse = JSON.parse(response).data.datasets;


  var intStart = parseInt(request.dateRange.startDate.replace(/-/g, ''));
  var intEnd = parseInt(request.dateRange.endDate.replace(/-/g, ''));

  // Transform parsed data and filter for requested fields
  parsedResponse = parsedResponse.filter(function(dataset) {
    var date = dataset.created.replace(/-/g, '').replace(/:/g, '').replace(/T/g, '').substring(0, 8);
    var intDate = parseInt(date)
    return (intDate >= intStart && intDate <= intEnd)
  });

  // Transform parsed data and filter for requested fields
  var requestedData = parsedResponse.map(function(dataset) {
    var values = [];
    requestedSchema.forEach(function (field) {
      switch (field.name) {
        case 'created_date':
          var date = dataset.created.replace(/-/g, '').replace(/:/g, '').replace(/T/g, '').substring(0, 8);
          values.push(date);
          break;
        case 'n_participants':
          if (dataset.draft.summary !== null) {
            values.push(dataset.draft.summary.subjects.length);
          } else {
            values.push(null)
          }
          break;
        default:
          values.push('');
      }
    });
    return { values: values };
  });
  
  return {
    schema: requestedSchema,
    rows: requestedData
  };
}