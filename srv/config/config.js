/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

// Return no more than this number of rows
const rowLimit = 1000

// DB refresh period in minutes
const refreshFrequency = 1440

// Number of rows to write to HANA in a single batch
const hanaWriteBatchSize = 20000

const apiVersionPrefix = '/api/v1/'

/**
 * =====================================================================================================================
 * Partial function to merge the properties of an incoming object into a base object
 * If the incoming object contains a property that is already present in the base object, then the base object's
 * property value is simply overwritten
 * =====================================================================================================================
 */
const mergeProperties =
  baseObj =>
    incomingObj =>
      Object.keys(incomingObj).reduce(
        (acc, prop) => (_ => acc)(acc[prop] = incomingObj[prop])
      , baseObj
      )

/**
 * =====================================================================================================================
 * Map the operators accepted in the URL query string to the corresponding operators required by SQL
 * =====================================================================================================================
 */
const like           = 'LIKE'
const simpleEquality = '='

const numericOperatorsMap = new Map()

  numericOperatorsMap.set ('=',   '=')
  numericOperatorsMap.set ('>',   '>')
  numericOperatorsMap.set ('<',   '<')
  numericOperatorsMap.set ('>=',  '>=')
  numericOperatorsMap.set ('<=',  '<=')
  numericOperatorsMap.set ('EQ',  '=')
  numericOperatorsMap.set ('GT',  '>')
  numericOperatorsMap.set ('LT',  '<')
  numericOperatorsMap.set ('GTE', '>=')
  numericOperatorsMap.set ('LTE', '<=')

  numericOperatorsMap.toString = function() {
    let acc = []
    this.forEach((_,k) => acc.push(`"${k}"`))
    return `${acc.join(', ')}`
  }

/**
 * =====================================================================================================================
 * Define the API structure
 * =====================================================================================================================
 */
const api_v1 = {
  // ===================================================================================================================
  // The data for this HANA table is imported directly from the GeoNames website rather than a hard-coded CSV file.
  // The colNames array must contain one entry for every column in the CSV file imported from GeoNames.org, but set that
  //field to null if that particular column value is not needed
  '/api/v1/geonames' : {
    dbTableName  : 'ORG_GEONAMES_GEONAMES'
  , cdsTableName : 'org.geonames.Geonames'
  , keyField     : 'GEONAMEID'
  , url          : '/api/v1/geonames'
  , type         : 'api'
  , description  : 'Geonames'
  , handler      : null
  , rowLimit     : rowLimit
  , parameters   : {
       geonameId       : { operators : simpleEquality,      colName : 'GEONAMEID' }      
     , name            : { operators : like,                colName : 'NAME' }
     , latitude        : { operators : simpleEquality,      colName : 'LATITUDE'}
     , longitude       : { operators : simpleEquality,      colName : 'LONGITUDE'}
     , altCountryCodes : { operators : like,                colName : 'COUNTRYCODESALT'}
     , admin1          : { operators : simpleEquality,      colName : 'ADMIN1'}
     , admin2          : { operators : simpleEquality,      colName : 'ADMIN2'}
     , admin3          : { operators : simpleEquality,      colName : 'ADMIN3'}
     , admin4          : { operators : simpleEquality,      colName : 'ADMIN4'}
     , population      : { operators : numericOperatorsMap, colName : 'POPULATION'}
     , elevation       : { operators : numericOperatorsMap, colName : 'ELEVATION'}
     , dem             : { operators : simpleEquality,      colName : 'DEM'}
     , lastModified    : { operators : simpleEquality,      colName : 'LASTMODIFIED'}
     , featureClass    : { operators : simpleEquality,      colName : 'FEATURECLASS_FEATURECLASS' }
     , featureCode     : { operators : simpleEquality,      colName : 'FEATURECODE_FEATURECODE' }
     , timezone        : { operators : like,                colName : 'TIMEZONE_TIMEZONENAME' }
     , countryCode     : { operators : simpleEquality,      colName : 'COUNTRYCODE_ISO2' }
    }
  , colNames : [
      "GeonameId", "Name", null, null
    , "Latitude", "Longitude", "FeatureClass_FeatureClass"
    , "FeatureCode_FeatureCode", "CountryCode_ISO2", "CountryCodesAlt"
    , "Admin1", "Admin2", "Admin3", "Admin4"
    , "Population", "Elevation", "DEM"
    , "Timezone_TimezoneName", "LastModified"]
  }

  // ===================================================================================================================
  // The data for this HANA table is imported directly from the GeoNames website rather than a hard-coded CSV file.
  // The colNames array must contain one entry for every column in the CSV file imported from GeoNames.org, but set that
  // field to null if that particular column value is not needed
, '/api/v1/alternate-names' : {
    dbTableName  : 'ORG_GEONAMES_ALTERNATENAMES'
  , cdsTableName : 'org.geonames.AlternateNames'
  , keyField     : 'ALTERNATENAMEID'
  , url          : '/api/v1/alternate-names'
  , type         : 'api'
  , description  : 'Alternate Names'
  , handler      : null
  , rowLimit     : rowLimit
  , parameters   : {
      alternameNameId : { operators : simpleEquality, colName : 'ALTERNATENAMEID' }
    , language        : { operators : simpleEquality, colName : 'ISOLANGUAGE' }
    , name            : { operators : like,           colName : 'ALTERNATENAME' }
    , isPreferred     : { operators : simpleEquality, colName : 'ISPREFERREDNAME' }
    , isShort         : { operators : simpleEquality, colName : 'ISSHORTNAME' }
    , isColloquial    : { operators : simpleEquality, colName : 'ISCOLLOQUIAL' }
    , isHistoric      : { operators : simpleEquality, colName : 'ISHISTORIC' }
    , isUseFrom       : { operators : like,           colName : 'INUSEFROM' }
    , isUseTo         : { operators : like,           colName : 'INUSETO' }
    , geonameId       : { operators : simpleEquality, colName : 'GEONAMEID_GEONAMEID' }
    }
  , colNames : [
      "AlternateNameId", "GeonameId_GeonameId", "ISOLanguage"
    , "AlternateName", "isPreferredName", "isShortName"
    , "isColloquial", "isHistoric", "inUseFrom", "inUseTo"
    ]
  }

  // ===================================================================================================================
, '/api/v1/countries' : {
    dbTableName  : 'ORG_GEONAMES_BASE_GEO_COUNTRIES'
  , cdsTableName : 'org.geonames.base.geo.Countries'
  , keyField     : 'ISO2'
  , url          : '/api/v1/countries'
  , type         : 'api'
  , description  : 'Countries'
  , handler      : null
  , rowLimit     : rowLimit
  , parameters   : {
      countryCode        : { operators : simpleEquality,      colName : 'ISO2'}
    , countryCode3       : { operators : simpleEquality,      colName : 'ISO3'}
    , numericCountryCode : { operators : simpleEquality,      colName : 'ISONUMERIC'}
    , fips               : { operators : simpleEquality,      colName : 'FIPS'}
    , name               : { operators : like,                colName : 'COUNTRYNAME'}
    , capital            : { operators : like,                colName : 'CAPITAL'}
    , area               : { operators : numericOperatorsMap, colName : 'AREA'}
    , population         : { operators : numericOperatorsMap, colName : 'POPULATION'}
    , tld                : { operators : simpleEquality,      colName : 'TLD'}
    , currencyCode       : { operators : simpleEquality,      colName : 'CURRENCYCODE'}
    , currencyName       : { operators : like,                colName : 'CURENCYNAME'}
    , diallingCode       : { operators : simpleEquality,      colName : 'DIALLINGCODE'}
    , languages          : { operators : like,                colName : 'LANGUAGE'}
    , neighbours         : { operators : like,                colName : 'NEIGHBOURS'}
    , continentCode      : { operators : simpleEquality,      colName : 'CONTINENT_CONTENTCODE'}
    }
  , colNames : []
  }

  // ===================================================================================================================
, '/api/v1/continents' : {
    dbTableName  : 'ORG_GEONAMES_BASE_GEO_CONTINENTS'
  , cdsTableName : 'org.geonames.base.geo.Continents'
  , keyField     : 'CONTINENTCODE'
  , url          : '/api/v1/continents'
  , type         : 'api'
  , description  : 'Continents'
  , handler      : null
  , rowLimit     : rowLimit
  , parameters   : {
      continentCode : { operators : simpleEquality, colName : 'CONTINENTCODE'}
    , name          : { operators : like,           colName : 'CONTINENTNAME'}
    }
  , colNames : []
  }

  // ===================================================================================================================
, '/api/v1/feature-classes' : {
    dbTableName  : 'ORG_GEONAMES_BASE_FEATURE_CLASSES'
  , cdsTableName : 'org.geonames.base.feature.Classes'
  , keyField     : 'FEATURECLASS'
  , url          : '/api/v1/feature-classes'
  , type         : 'api'
  , description  : 'Feature Classes'
  , handler      : null
  , rowLimit     : rowLimit
  , parameters   : {
      featureClass : { operators : simpleEquality, colName : 'FEATURECLASS'}
    , description  : { operators : like,           colName : 'DESCRIPTION'}
    }
  , colNames : []
  }

  // ===================================================================================================================
, '/api/v1/feature-codes' : {
    dbTableName  : 'ORG_GEONAMES_BASE_FEATURE_CODES'
  , cdsTableName : 'org.geonames.base.feature.Codes'
  , keyField     : 'FEATURECODE'
  , url          : '/api/v1/feature-codes'
  , type         : 'api'
  , description  : 'Feature Codes'
  , handler      : null
  , rowLimit     : rowLimit
  , parameters   : {
      featureCode      : { operators : simpleEquality, colName : 'FEATURECODE'}
    , shortDescription : { operators : like,           colName : 'SHORTDESCRIPTION'}
    , longDescription  : { operators : like,           colName : 'LONGDESCRIPTION'}
    , featureClass     : { operators : simpleEquality, colName : 'FEATURECLASS_FEATURECLASS'}
    }
  , colNames : []
  }

  // ===================================================================================================================
, '/api/v1/languages' : {
    dbTableName  : 'ORG_GEONAMES_BASE_LANG_LANGUAGECODES'
  , cdsTableName : 'org.geonames.base.lang.LanguageCodes'
  , keyField     : 'ISO639_3'
  , url          : '/api/v1/languages'
  , type         : 'api'
  , description  : 'Languages'
  , handler      : null
  , rowLimit     : rowLimit
  , parameters   : {
      'iso639-3' : { operators : simpleEquality, colName : 'ISO639_3'}
    , 'iso639-2' : { operators : simpleEquality, colName : 'ISO639_2'}
    , 'iso639-1' : { operators : simpleEquality, colName : 'ISO639_1'}
    , name       : { operators : simpleEquality, colName : 'LANGUAGENAME'}
    }
  , colNames : []
  }

  // ===================================================================================================================
, '/api/v1/timezones' : {
    dbTableName  : 'ORG_GEONAMES_BASE_TIME_TIMEZONES'
  , cdsTableName : 'org.geonames.base.time.Timezones'
  , keyField     : 'TIMEZONENAME'
  , url          : '/api/v1/timezones'
  , type         : 'api'
  , description  : 'Timezones'
  , handler      : null
  , rowLimit     : rowLimit
  , parameters   : {
      name        : { operators : like,                colName : 'TIMEZONENAME' }
    , gmtOffset   : { operators : numericOperatorsMap, colName : 'GMTOFFSET' }
    , rawOffset   : { operators : numericOperatorsMap, colName : 'RAWOFFSET' }
    , dstOffset   : { operators : numericOperatorsMap, colName : 'DSTOFFSET' }
    , countryCode : { operators : simpleEquality,      colName : 'COUNTRYCODE_ISO2' }
    }
  }
  , colNames : []
}

/**
 * =====================================================================================================================
 * In Development and Production, the server will respond to the following URLs
 * =====================================================================================================================
 */
const dev_links = {
  '/debug' : {
    url         : '/debug'
  , type        : 'link'
  , description : 'Show server-side object contents'
  , handler     : null
  }
}

const prod_links = {
  '/admin' : {
    url         : '/admin'
  , type        : 'link'
  , description : 'Server admin'
  , handler     : null
  }
}

var mergeIntoApis     = mergeProperties(api_v1)
var prodUrls          = mergeIntoApis(prod_links)
var mergeIntoProdUrls = mergeProperties(prodUrls)

/**
 * =====================================================================================================================
 * Runtime parameters that could change between development and production
 * 
 * refresh_freq : The time interval (in minutes) that must elapse before refreshing the database from Geonames.org
 * =====================================================================================================================
 */
const config = {
  // ===================================================================================================================
  // Configuration settings applicable for a development environment
  // ===================================================================================================================
  development : {
    batchSize        : hanaWriteBatchSize
  , environment      : "development"
  , refresh_freq     : refreshFrequency
  , urls             : mergeIntoProdUrls(dev_links)
  , genericRowLimit  : rowLimit
  , apiVersionPrefix : apiVersionPrefix
  }

  // ===================================================================================================================
  // Configuration settings applicable for a production environment
  // ===================================================================================================================
, production : {
    batchSize        : hanaWriteBatchSize
  , environment      : "production"
  , refresh_freq     : refreshFrequency
  , urls             : prodUrls
  , genericRowLimit  : rowLimit
  , apiVersionPrefix : apiVersionPrefix
  }
}

// =====================================================================================================================
// Public API
// =====================================================================================================================

// Sometimes its necessary to force the use of development mode, even though you're running in an environment configured
// to be production
//module.exports = config[process.env.NODE_ENV || 'development']
module.exports = config['development']


