/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

const settings = require('./config_settings.js')

module.exports = {
    dbTableName  : 'ORG_GEONAMES_BASE_FEATURE_CODES'
  , cdsTableName : 'org.geonames.base.feature.Codes'
  , keyField     : 'FEATURECODE'
  , url          : `${settings.apiVersionPrefix}feature-codes`
  , type         : 'api'
  , description  : 'Feature Codes'
  , handler      : null
  , rowLimit     : settings.rowLimit
  , parameters   : {
      featureCode      : { operators : settings.simpleEquality, colName : 'FEATURECODE'}
    , shortDescription : { operators : settings.like,           colName : 'SHORTDESCRIPTION'}
    , longDescription  : { operators : settings.like,           colName : 'LONGDESCRIPTION'}
    , featureClass     : { operators : settings.simpleEquality, colName : 'FEATURECLASS_FEATURECLASS'}
    }
  , colNames : []
}
