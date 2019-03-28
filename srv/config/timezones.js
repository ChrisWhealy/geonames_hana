/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

const settings = require('./config_settings.js')

module.exports = {
    dbTableName  : 'ORG_GEONAMES_BASE_TIME_TIMEZONES'
  , cdsTableName : 'org.geonames.base.time.Timezones'
  , keyField     : 'TIMEZONENAME'
  , url          : `${settings.apiVersionPrefix}timezones`
  , type         : 'api'
  , description  : 'Timezones'
  , handler      : null
  , rowLimit     : settings.rowLimit
  , parameters   : {
      name            : { operators : settings.like,                colName : 'TIMEZONENAME' }
    , timezoneName    : { operators : settings.like,                colName : 'TIMEZONENAME' }
    , gmtOffset       : { operators : settings.numericOperatorsMap, colName : 'GMTOFFSET' }
    , rawOffset       : { operators : settings.numericOperatorsMap, colName : 'RAWOFFSET' }
    , dstOffset       : { operators : settings.numericOperatorsMap, colName : 'DSTOFFSET' }
    , countryCode     : { operators : settings.simpleEquality,      colName : 'COUNTRYCODE_ISO2' }
    , countryCodeIso2 : { operators : settings.simpleEquality,      colName : 'COUNTRYCODE_ISO2' }
    }
  , colNames : []
}