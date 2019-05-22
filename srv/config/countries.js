/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

const settings = require('./config_settings.js')

module.exports = {
    dbTableName  : 'ORG_GEONAMES_BASE_GEO_COUNTRIES'
  , cdsTableName : 'org.geonames.base.geo.Countries'
  , keyField     : 'ISO2'
  , url          : `${settings.apiVersionPrefix}countries`
  , type         : 'api'
  , description  : 'Countries'
  , handler      : null
  , rowLimit     : settings.rowLimit
  , parameters   : {
      countryCode        : { operators : settings.simpleEquality,      colName : 'ISO2'}
    , iso2               : { operators : settings.simpleEquality,      colName : 'ISO2'}
    , countryCode3       : { operators : settings.simpleEquality,      colName : 'ISO3'}
    , iso3               : { operators : settings.simpleEquality,      colName : 'ISO3'}
    , numericCountryCode : { operators : settings.simpleEquality,      colName : 'ISONUMERIC'}
    , isoNumeric         : { operators : settings.simpleEquality,      colName : 'ISONUMERIC'}
    , fips               : { operators : settings.simpleEquality,      colName : 'FIPS'}
    , name               : { operators : settings.like,                colName : 'COUNTRYNAME'}
    , countryName        : { operators : settings.like,                colName : 'COUNTRYNAME'}
    , capital            : { operators : settings.like,                colName : 'CAPITAL'}
    , area               : { operators : settings.numericOperatorsMap, colName : 'AREA'}
    , population         : { operators : settings.numericOperatorsMap, colName : 'POPULATION'}
    , tld                : { operators : settings.simpleEquality,      colName : 'TLD'}
    , currencyCode       : { operators : settings.simpleEquality,      colName : 'CURRENCYCODE'}
    , currencyName       : { operators : settings.like,                colName : 'CURENCYNAME'}
    , diallingCode       : { operators : settings.simpleEquality,      colName : 'DIALLINGCODE'}
    , languages          : { operators : settings.like,                colName : 'LANGUAGE'}
    , neighbours         : { operators : settings.like,                colName : 'NEIGHBOURS'}
    , continentCode      : { operators : settings.simpleEquality,      colName : 'CONTINENT_CONTINENTCODE'}
    }
  , colNames : []
}
