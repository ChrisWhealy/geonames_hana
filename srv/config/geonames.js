/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

const settings = require('./config_settings.js')

module.exports = {
  // ===================================================================================================================
  // The data for this HANA table is imported directly from the GeoNames website rather than a hard-coded CSV file.
  // The colNames array must contain one entry for every column in the CSV file imported from GeoNames.org.  If any
  // particular column value is not needed, then set that array element to null
    dbTableName  : 'ORG_GEONAMES_GEONAMES'
  , cdsTableName : 'org.geonames.Geonames'
  , keyField     : 'GEONAMEID'
  , url          : `${settings.apiVersionPrefix}geonames`
  , type         : 'api'
  , description  : 'Geonames'
  , handler      : null
  , rowLimit     : settings.rowLimit
  , parameters   : {
      geonameId       : { operators : settings.simpleEquality,      colName : 'GEONAMEID' }      
    , name            : { operators : settings.like,                colName : 'NAME' }
    , latitude        : { operators : settings.simpleEquality,      colName : 'LATITUDE'}
    , longitude       : { operators : settings.simpleEquality,      colName : 'LONGITUDE'}
    , altCountryCodes : { operators : settings.like,                colName : 'COUNTRYCODESALT'}
    , countryCodesAlt : { operators : settings.like,                colName : 'COUNTRYCODESALT'}
    , admin1          : { operators : settings.simpleEquality,      colName : 'ADMIN1'}
    , admin2          : { operators : settings.simpleEquality,      colName : 'ADMIN2'}
    , admin3          : { operators : settings.simpleEquality,      colName : 'ADMIN3'}
    , admin4          : { operators : settings.simpleEquality,      colName : 'ADMIN4'}
    , population      : { operators : settings.numericOperatorsMap, colName : 'POPULATION'}
    , elevation       : { operators : settings.numericOperatorsMap, colName : 'ELEVATION'}
    , dem             : { operators : settings.simpleEquality,      colName : 'DEM'}
    , lastModified    : { operators : settings.simpleEquality,      colName : 'LASTMODIFIED'}
    , featureClass    : { operators : settings.simpleEquality,      colName : 'FEATURECLASS_FEATURECLASS' }
    , featureCode     : { operators : settings.simpleEquality,      colName : 'FEATURECODE_FEATURECODE' }
    , timezone        : { operators : settings.like,                colName : 'TIMEZONE_TIMEZONENAME' }
    , countryCode     : { operators : settings.simpleEquality,      colName : 'COUNTRYCODE_ISO2' }
    , countryCodeIso2 : { operators : settings.simpleEquality,      colName : 'COUNTRYCODE_ISO2' }
    }
  , colNames : [
      "GeonameId", "Name", null, null, "Latitude", "Longitude"
    , "FeatureClass_FeatureClass", "FeatureCode_FeatureCode"
    , "CountryCode_ISO2", "CountryCodesAlt"
    , "Admin1", "Admin2", "Admin3", "Admin4"
    , "Population", "Elevation", "DEM"
    , "Timezone_TimezoneName", "LastModified"
    ]
}
