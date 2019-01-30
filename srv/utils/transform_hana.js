/**
 * =====================================================================================================================
 * @fileOverview Transform a tab-delimietd text strean into batches of HANA UPSERT statements
 * =====================================================================================================================
 **/

const es      = require('event-stream')
const dbUtils = require('./dbUtils.js')

/***********************************************************************************************************************
 * A list of all column names found in a geonames country file. These names must match the names of the columns in the
 * HANA DB table.
 * 
 * If a column in the text file is not needed in the database, then the column name must be set to undefined
 */
var geonamesDbCols = [
  "GeonameId", "Name", undefined, undefined, "Latitude", "Longitude"
, "FeatureClass_FeatureClass", "FeatureCode_FeatureCode", "CountryCode_ISO2"
, "CountryCodesAlt", "Admin1", "Admin2", "Admin3", "Admin4", "Population"
, "Elevation", "DEM", "Timezone_TimezoneName", "LastModified"]

var alternateNamesDbCols = [
  "AlternateNameId", "GeonameId_GeonameId", "ISOLanguage", "AlternateName"
, "isPreferredName", "isShortName", "isColloquial", "isHistoric", "inUseFrom", "inUseTo"
]

/***********************************************************************************************************************
 * Handle a text file stream encountered within a ZIP file
 */
const handleTextFile =
  (propList, tabName) =>
    (entry, countryObj, isAltNames, etag) =>
       entry
         .pipe(es.split())
         .pipe(new dbUtils.Upsert({batchSize: 500, columns: propList, tableName: tabName, iso2: countryObj.ISO2}))
         .on('finish', () => {
            // Assign the current eTag to the correct object property
            (isAltNames) ? countryObj.ALTNAMESETAG = etag : countryObj.COUNTRYETAG = etag
            
            // Update the CountryInfo Table with the new eTag value
            return cds.run( dbUtils.genUpsertFrom( "ORG_GEONAMES_BASE_GEO_COUNTRIES", Object.keys(countryObj))
                          , Object.values(countryObj))
                      .catch(console.error)
         })

/**
 * =====================================================================================================================
 * Public API
 * =====================================================================================================================
 **/
module.exports = {
  handleGeonamesFile       : handleTextFile(geonamesDbCols,       "ORG_GEONAMES_GEONAMES")
, handleAlternateNamesFile : handleTextFile(alternateNamesDbCols, "ORG_GEONAMES_ALTERNATENAMES")
}
