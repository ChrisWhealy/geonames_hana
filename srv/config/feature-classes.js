/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

const settings = require('./config_settings.js')

module.exports = {
    dbTableName  : 'ORG_GEONAMES_BASE_FEATURE_CLASSES'
  , cdsTableName : 'org.geonames.base.feature.Classes'
  , keyField     : 'FEATURECLASS'
  , url          : `${settings.apiVersionPrefix}feature-classes`
  , type         : 'api'
  , description  : 'Feature Classes'
  , handler      : null
  , rowLimit     : settings.rowLimit
  , parameters   : {
      featureClass : { operators : settings.simpleEquality, colName : 'FEATURECLASS'}
    , description  : { operators : settings.like,           colName : 'DESCRIPTION'}
    }
  , colNames : []
}