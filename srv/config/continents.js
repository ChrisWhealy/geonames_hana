/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

const settings = require('./config_settings.js')

module.exports = {
    dbTableName  : 'ORG_GEONAMES_BASE_GEO_CONTINENTS'
  , cdsTableName : 'org.geonames.base.geo.Continents'
  , keyField     : 'CONTINENTCODE'
  , url          : `${settings.apiVersionPrefix}continents`
  , type         : 'api'
  , description  : 'Continents'
  , handler      : null
  , rowLimit     : settings.rowLimit
  , parameters   : {
      continentCode : { operators : settings.simpleEquality, colName : 'CONTINENTCODE'}
    , name          : { operators : settings.like,           colName : 'CONTINENTNAME'}
    , continentName : { operators : settings.like,           colName : 'CONTINENTNAME'}
    }
  , colNames : []
}