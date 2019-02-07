/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

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
    environment    : "development"
  , refresh_freq   : 1440

  , tables : {
      'debug'          : { cdsTableName : null
                         , dbTableName  : null
                         , url          : '/debug'
                         , description  : 'Show server-side object contents'
                         , handler      : null
                         }
    , 'geonames'       : { cdsTableName : 'org.geonames.Geonames'
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
  }

  // ===================================================================================================================
  // Configuration settings applicable for a production environment
  // ===================================================================================================================
, production : {
    environment    : "production"
  , refresh_freq   : 1440

  , tables : {
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
  }
}

// =====================================================================================================================
// Public API
// =====================================================================================================================

// Sometimes its necessary to force it into development mode, even though you're running in an environment configured to
// be production
//module.exports = config[process.env.NODE_ENV || 'development']
module.exports = config['development']



