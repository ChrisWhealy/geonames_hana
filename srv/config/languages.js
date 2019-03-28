/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

const settings = require('./config_settings.js')

module.exports = {
    dbTableName  : 'ORG_GEONAMES_BASE_LANG_LANGUAGECODES'
  , cdsTableName : 'org.geonames.base.lang.LanguageCodes'
  , keyField     : 'ISO639_3'
  , url          : `${settings.apiVersionPrefix}languages`
  , type         : 'api'
  , description  : 'Languages'
  , handler      : null
  , rowLimit     : settings.rowLimit
  , parameters   : {
      'iso639-3'    : { operators : settings.simpleEquality, colName : 'ISO639_3'}
    , 'iso639-2'    : { operators : settings.simpleEquality, colName : 'ISO639_2'}
    , languageCode3 : { operators : settings.simpleEquality, colName : 'ISO639_2'}
    , 'iso639-1'    : { operators : settings.simpleEquality, colName : 'ISO639_1'}
    , languageCode2 : { operators : settings.simpleEquality, colName : 'ISO639_1'}
    , name          : { operators : settings.simpleEquality, colName : 'LANGUAGENAME'}
    , languageName  : { operators : settings.simpleEquality, colName : 'LANGUAGENAME'}
    }
  , colNames : []
}
