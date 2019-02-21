/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

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
 * Standard table definitions, used in both development and production modes
 * =====================================================================================================================
 */
const standard_tables = {
  'geonames'       : { cdsTableName : 'org.geonames.Geonames'
                     , dbTableName  : 'ORG_GEONAMES_GEONAMES'
                     , url          : '/show_geonames'
                     , description  : 'Show Geonames table'
                     , handler      : null
                     }
, 'alternateNames' : { cdsTableName : 'org.geonames.AlternateNames'
                     , dbTableName  : 'ORG_GEONAMES_ALTERNATENAMES'
                     , url          : '/show_alternatenames'
                     , description  : 'Show AlternateNames table'
                     , handler      : null
                     }
, 'countries'      : { cdsTableName : 'org.geonames.base.geo.Countries'
                     , dbTableName : 'ORG_GEONAMES_BASE_GEO_COUNTRIES'
                     , url          : '/show_countries'
                     , description  : 'Show Countries table'
                     , handler      : null
                     }
, 'continents'     : { cdsTableName : 'org.geonames.base.geo.Continents'
                     , dbTableName  : 'ORG_GEONAMES_BASE_GEO_CONTINENTS'
                     , url          : '/show_continents'
                     , description  : 'Show Continents table'
                     , handler      : null
                     }
, 'featureClasses' : { cdsTableName : 'org.geonames.base.feature.Classes'
                     , dbTableName  : 'ORG_GEONAMES_BASE_FEATURE_CLASSES'
                     , url          : '/show_featureclasses'
                     , description  : 'Show FeatureClasses table'
                     , handler      : null
                     }
, 'featureCodes'   : { cdsTableName : 'org.geonames.base.feature.Codes'
                     , dbTableName  : 'ORG_GEONAMES_BASE_FEATURE_CODES'
                     , url          : '/show_featurecodes'
                     , description  : 'Show FeatureCodes table'
                     , handler      : null
                     }
, 'languages'      : { cdsTableName : 'org.geonames.base.lang.LanguageCodes'
                     , dbTableName  : 'ORG_GEONAMES_BASE_LANG_LANGUAGECODES'
                     , url          : '/show_languagecodes'
                     , description  : 'Show LanguageCodes table'
                     , handler      : null
                     }
, 'timezones'      : { cdsTableName : 'org.geonames.base.time.Timezones'
                     , dbTableName  : 'ORG_GEONAMES_BASE_TIME_TIMEZONES'
                     , url          : '/show_timezones'
                     , description  : 'Show Timezones table'
                     , handler      : null
                     }
}

/**
 * =====================================================================================================================
 * API whitelist
 * 
 * The parameters named as mandatory and optional perform two roles:
 *   1) We can validate whether or not the mandatory query string parameters have been supplied
 *   2) The query string parameter name can be substituted for required table column name in the SQL statement
 * 
 * =====================================================================================================================
 */
const like             = 'LIKE'
const simpleEquality   = '='
const numericOperators = ['=','>','<','>=','<=','EQ','GT','LT','GTE','LTE']

const api_v1 = {
  'geonames' : {
    dbTableName : 'ORG_GEONAMES_GEONAMES'
  , keyField    : 'GEONAMEID'
  , url         : '/api/v1/geonames'
  , handler     : null
  , rowLimit    : 1000
  , parameters  : {
      mandatory : {
        name : { operators : like, colName : 'NAME' }
      }
    , optional : {
        featureClass : { operators : simpleEquality,   colName : 'FEATURECLASS_FEATURECLASS' }
      , featureCode  : { operators : simpleEquality,   colName : 'FEATURECODE_FEATURECODE' }
      , countryCode  : { operators : simpleEquality,   colName : 'COUNTRYCODE_ISO2' }
      , population   : { operators : numericOperators, colName : 'POPULATION'}
      }
    }
  }
}

/**
 * =====================================================================================================================
 * Development and Production link whitelist
 * =====================================================================================================================
 */
const dev_links = {
  'debug' : { url         : '/debug'
            , description : 'Show server-side object contents'
            , handler     : null
            }
}

const prod_links = {
  'admin' : { url         : '/admin'
            , description : 'Server admin'
            , handler     : null
            }
}

var mergeIntoProdLinks = mergeProperties(prod_links)

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
    environment  : "development"
  , refresh_freq : 1440
  , tables       : standard_tables
  , links        : mergeIntoProdLinks(dev_links)
  , api          : api_v1
  }

  // ===================================================================================================================
  // Configuration settings applicable for a production environment
  // ===================================================================================================================
, production : {
    environment  : "production"
  , refresh_freq : 1440
  , tables       : standard_tables
  , links        : prod_links
  , api          : api_v1
  }
}

// =====================================================================================================================
// Public API
// =====================================================================================================================

// Sometimes its necessary to force the use of development mode, even though you're running in an environment configured
// to be production
//module.exports = config[process.env.NODE_ENV || 'development']
module.exports = config['development']



