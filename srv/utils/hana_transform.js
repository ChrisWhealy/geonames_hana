/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

/**
 * =====================================================================================================================
 * Transform a tab-delimited text strean into batches of HANA UPSERT statements
 * =====================================================================================================================
 **/
const es       = require('event-stream')
const cds      = require('@sap/cds')
const db_utils = require('./db_utils.js')
const config   = require('../config/config.js')

/***********************************************************************************************************************
 * Handle a text file stream encountered within a ZIP file
 * When the read stream finishes, update the relavant eTag field in the country table
 */
const handleTextFile =
  tableConfig =>
    (entry, countryObj, isAltNames, etag) =>
      entry
        .pipe(es.split())
        .pipe(new db_utils.Upsert({tableConfig: tableConfig, iso2: countryObj.ISO2}))
        .on('finish', () => {
          // Update the appropriate eTag value and time fields
          if (isAltNames) {
            countryObj.ALTNAMESETAG     = etag
            countryObj.ALTNAMESETAGTIME = Date.now()
          }
          else {
            countryObj.COUNTRYETAG     = etag
            countryObj.COUNTRYETAGTIME = Date.now()
          }

          return cds.run( db_utils.genUpsertFrom( "ORG_GEONAMES_BASE_GEO_COUNTRIES", Object.keys(countryObj))
                        , Object.values(countryObj))
                    .catch(console.error)
        })

/**
 * =====================================================================================================================
 * Public API
 * =====================================================================================================================
 **/

module.exports = {
  handleGeonamesFile       : handleTextFile(config.urls[`${config.apiVersionPrefix}geonames`])
, handleAlternateNamesFile : handleTextFile(config.urls[`${config.apiVersionPrefix}alternate-names`])
}
