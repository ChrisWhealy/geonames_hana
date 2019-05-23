/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

/**
 * =====================================================================================================================
 * Transform a tab-delimited text strean into batches of HANA UPSERT statements
 * =====================================================================================================================
 **/
const ES     = require('event-stream')
const CDS    = require('@sap/cds')
const DB     = require('./db_utils.js')
const Config = require('../config/config.js')

/***********************************************************************************************************************
 * Handle a text file stream encountered within a ZIP file
 * When the read stream finishes, update the relevant eTag field in the country table
 */
const handleTextFile =
  tableConfig =>
    (ws, entry, countryObj, isAltName, etag) =>
      entry
        .pipe(ES.split())
        .pipe(new DB.Upsert({webSocket: ws, tableConfig: tableConfig, iso2: countryObj.ISO2, isAltName: isAltName}))
        .on('finish', () => {
          // Update the appropriate eTag value and time fields
          if (isAltName) {
            countryObj.ALTNAMESETAG     = etag
            countryObj.ALTNAMESETAGTIME = Date.now()
          }
          else {
            countryObj.COUNTRYETAG     = etag
            countryObj.COUNTRYETAGTIME = Date.now()
          }

          return CDS.run( DB.genUpsertFrom("ORG_GEONAMES_BASE_GEO_COUNTRIES", Object.keys(countryObj))
                        , Object.values(countryObj))
                    .catch(console.error)
        })

/**
 * =====================================================================================================================
 * Public API
 * =====================================================================================================================
 **/

module.exports = {
  handleGeonamesFile       : handleTextFile(Config.urls[`${Config.apiVersionPrefix}geonames`])
, handleAlternateNamesFile : handleTextFile(Config.urls[`${Config.apiVersionPrefix}alternate-names`])
}
