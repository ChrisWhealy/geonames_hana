/**
 * =====================================================================================================================
 * @fileOverview Transform a tab-delimietd text strean into batches of HANA UPSERT statements
 * =====================================================================================================================
 **/

const es      = require('event-stream')
const dbUtils = require('./dbUtils.js')

/***********************************************************************************************************************
 * Metadata objects for the tables being updated
 * The colNames property must conform to the following constraints:
 * 1) It must contain an entry for all columns in the corresponding text file
 * 2) Each entry must be either the HANA table column name, or null if that column is not to be imported into HANA
 */
const geoNames = new dbUtils.TableMetadata({
  tableName : "ORG_GEONAMES_GEONAMES"
, colNames : ["GeonameId", "Name", null, null, "Latitude", "Longitude", "FeatureClass_FeatureClass"
  , "FeatureCode_FeatureCode", "CountryCode_ISO2", "CountryCodesAlt", "Admin1", "Admin2", "Admin3", "Admin4"
  , "Population", "Elevation", "DEM", "Timezone_TimezoneName", "LastModified"]
})

const alternateNames = new dbUtils.TableMetadata({
  tableName : "ORG_GEONAMES_ALTERNATENAMES"
, colNames : ["AlternateNameId", "GeonameId_GeonameId", "ISOLanguage", "AlternateName", "isPreferredName", "isShortName"
  , "isColloquial", "isHistoric", "inUseFrom", "inUseTo"]
})

/***********************************************************************************************************************
 * Handle a text file stream encountered within a ZIP file
 */
const handleTextFile =
  dbTableData =>
    (entry, countryObj, isAltNames, etag) =>
       entry
         .pipe(es.split())
         .pipe(new dbUtils.Upsert({dbTableData: dbTableData, iso2: countryObj.ISO2}))
         
         // When the stream finishes, update the relavant eTag field in the country table
         .on('finish', () => {
            // Assign the current eTag to the correct object property
            isAltNames ? countryObj.ALTNAMESETAG = etag : countryObj.COUNTRYETAG = etag
            
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
  handleGeonamesFile       : handleTextFile(geoNames)
, handleAlternateNamesFile : handleTextFile(alternateNames)
}
