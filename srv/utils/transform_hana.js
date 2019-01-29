/**
 * =====================================================================================================================
 * @fileOverview Transform a tab-delimietd text strean into batches of HANA UPSERT statements
 * =====================================================================================================================
 **/

const es     = require('event-stream')
const Upsert = require('./upsert.js')

/***********************************************************************************************************************
 * A list of all column names found in a geonames country file. These names must match the names of the columns in the
 * HANA DB table.
 * 
 * If a column in the text file is not needed in the database, then the column name must be set to undefined
 */
var geonamesDbCols = [
  "GeonameId", "Name", undefined, undefined, "Latitude", "Longitude", "FeatureClass", "FeatureCode", "CountryCode"
, "CountryCodesAlt", "Admin1", "Admin2", "Admin3", "Admin4", "Population", "Elevation", "DEM", "Timezone", "LastModified"]

var alternateNamesDbCols = [
  "AlternateNameId", "GeonameId", "ISOLanguage", "AlternateName"
, "isPreferredName", "isShortName", "isColloquial", "isHistoric", "inUseFrom", "inUseTo"
]

/***********************************************************************************************************************
 * Handle a text file stream encountered within a ZIP file
 */
const handleTextFile =
  (propList, tabName) =>
    (entry, countryCode, etag) => {
      console.log(`Processing ${countryCode}.txt`)

     // Pipe read into write to handle backpreasure
     entry
       .pipe(es.split())
       .pipe(new Upsert({batchSize: 500, columns: propList, tableName: tabName}))
  }

/**
 * =====================================================================================================================
 * Public API
 * =====================================================================================================================
 **/
module.exports = {
  handleGeonamesFile       : handleTextFile(geonamesDbCols, "ORG_GEONAMES_GEONAMES")
, handleAlternateNamesFile : handleTextFile(alternateNamesDbCols, "ORG_GEONAMES_ALTERNATENAMES")
}
