/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

const { updateObj } = require('../utils/functional_tools.js')


// Return no more than this number of rows
const rowLimit = 1000

// DB refresh period in minutes
const refreshFrequency = 1440

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


/**
 * =====================================================================================================================
 * Define the API structure
 * =====================================================================================================================
 */
const api_v1 = {
  // ===================================================================================================================
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
      mandatory : {
        name : { operators : like, colName : 'NAME' }
      }
    , optional : {
        featureClass : { operators : simpleEquality,      colName : 'FEATURECLASS_FEATURECLASS' }
      , featureCode  : { operators : simpleEquality,      colName : 'FEATURECODE_FEATURECODE' }
      , countryCode  : { operators : simpleEquality,      colName : 'COUNTRYCODE_ISO2' }
      , population   : { operators : numericOperatorsMap, colName : 'POPULATION'}
      }
    }
  }

  // ===================================================================================================================
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
      mandatory : {
        name     : { operators : like,           colName : 'ALTERNATENAME' }
      , language : { operators : simpleEquality, colName : 'ISO_LANGUAGE' }
      }
    , optional : {
        isPreferred  : { operators : simpleEquality, colName : 'ISPREFERREDNAME' }
      , isShort      : { operators : simpleEquality, colName : 'ISSHORTNAME' }
      , isColloquial : { operators : simpleEquality, colName : 'ISCOLLOQUIAL' }
      , isHistoric   : { operators : simpleEquality, colName : 'ISHISTORIC' }
      }
    }
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
      mandatory : {}
    , optional : {}
    }
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
      mandatory : {}
    , optional : {}
    }
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
      mandatory : {}
    , optional : {}
    }
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
      mandatory : {}
    , optional : {}
    }
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
      mandatory : {}
    , optional : {}
    }
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
      mandatory : {}
    , optional : {
        gmtOffset   : { operators : numericOperatorsMap, colName : 'GMTOFFSET' }
      , rawOffset   : { operators : numericOperatorsMap, colName : 'RAWOFFSET' }
      , dstOffset   : { operators : numericOperatorsMap, colName : 'DSTOFFSET' }
      , countryCode : { operators : simpleEquality,      colName : 'COUNTRYCODE' }
      }
    }
  }
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

// =====================================================================================================================
// Add a link into the prod_links object for each table listed in the API object
// =====================================================================================================================
//   Object
//     .keys(api_v1)
//     .reduce((acc, api) =>
//       updateObj(acc, api, {
//         url         : api_v1[api].url
//       , type        : 'link'
//       , description : api_v1[api].description
//       , handler     : null
//       })
//     , prod_links)

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
    environment     : "development"
  , refresh_freq    : refreshFrequency
  , urls            : mergeIntoProdUrls(dev_links)
  , genericRowLimit : rowLimit
  }

  // ===================================================================================================================
  // Configuration settings applicable for a production environment
  // ===================================================================================================================
, production : {
    environment     : "production"
  , refresh_freq    : refreshFrequency
  , urls            : prodUrls
  , genericRowLimit : rowLimit
  }
}

// =====================================================================================================================
// Public API
// =====================================================================================================================

// Sometimes its necessary to force the use of development mode, even though you're running in an environment configured
// to be production
//module.exports = config[process.env.NODE_ENV || 'development']
module.exports = config['development']



