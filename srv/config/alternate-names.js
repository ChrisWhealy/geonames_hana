/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

const settings = require('./config_settings.js')

module.exports = {
  // ===================================================================================================================
  // The data for this HANA table is imported directly from the GeoNames website rather than a hard-coded CSV file.
  // The colNames array must contain one entry for every column in the CSV file imported from GeoNames.org.  If any
  // particular column value is not needed, then set that array element to null
    dbTableName  : 'ORG_GEONAMES_ALTERNATENAMES'
  , cdsTableName : 'org.geonames.AlternateNames'
  , keyField     : 'ALTERNATENAMEID'
  , url          : `${settings.apiVersionPrefix}alternate-names`
  , type         : 'api'
  , description  : 'Alternate Names'
  , handler      : null
  , rowLimit     : settings.rowLimit
  , parameters   : {
      alternateNameId : { operators : settings.simpleEquality, colName : 'ALTERNATENAMEID' }
    , language        : { operators : settings.simpleEquality, colName : 'ISOLANGUAGE' }
    , isoLanguage     : { operators : settings.simpleEquality, colName : 'ISOLANGUAGE' }
    , name            : { operators : settings.like,           colName : 'ALTERNATENAME' }
    , alternateName   : { operators : settings.like,           colName : 'ALTERNATENAME' }
    , isPreferred     : { operators : settings.simpleEquality, colName : 'ISPREFERREDNAME' }
    , isPreferredName : { operators : settings.simpleEquality, colName : 'ISPREFERREDNAME' }
    , isShort         : { operators : settings.simpleEquality, colName : 'ISSHORTNAME' }
    , isShortName     : { operators : settings.simpleEquality, colName : 'ISSHORTNAME' }
    , isColloquial    : { operators : settings.simpleEquality, colName : 'ISCOLLOQUIAL' }
    , isHistoric      : { operators : settings.simpleEquality, colName : 'ISHISTORIC' }
    , isUseFrom       : { operators : settings.like,           colName : 'INUSEFROM' }
    , isUseTo         : { operators : settings.like,           colName : 'INUSETO' }
    , geonameId       : { operators : settings.simpleEquality, colName : 'GEONAMEID_GEONAMEID' }
    }
  , colNames : [
      "AlternateNameId", "GeonameId_GeonameId", "ISOLanguage"
    , "AlternateName", "isPreferredName", "isShortName"
    , "isColloquial", "isHistoric", "inUseFrom", "inUseTo"
    ]
}