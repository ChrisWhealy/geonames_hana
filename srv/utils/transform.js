#!/usr/bin/env node

/**
 * =====================================================================================================================
 * @fileOverview stream_to_csv
 * 
 * Convert a read stream containing a tab delimited text file to a corresponding CSV file with optional mapping to omit
 * certain columns
 * =====================================================================================================================
 **/

const fs = require('fs')
const es = require('event-stream')

/***********************************************************************************************************************
 * All the columns needed in the HANA table must be listed in order they appear in the tab-delimited text file
 * If a column in the text file is not needed in the HANA table, then that array entry must be set to 'undefined'
 */
var geonamesDbCols = [
  "GeonameId", "Name", undefined, undefined, "Latitude", "Longitude", "FeatureClass", "FeatureCode", "CountryCode"
, "CountryCodesAlt", "Admin1", "Admin2", "Admin3", "Admin4", "Population", "Elevation", "DEM", "Timezone", "LastModified"]


/***********************************************************************************************************************
 * Useful functions
 **/
const push = (arr, el) => (_ => arr)(arr.push(el))

const isNullOrUndef = x => x === null || x === undefined

/***********************************************************************************************************************
 * Partial function that can be used with Array.reduce on one line of a text file
 * The propList argument is property list array of all columns in the text file, where the unwanted columns are set to
 * undefined instead of the column name
 * 
 * If a particular column value contains a comma, then this value is delimited with double quotes
 */
const reduceColumns =
  propList =>
    (acc, el, idx) =>
      isNullOrUndef(propList[idx]) ? acc : push(acc, el.indexOf(",") > -1 ? `"${el}"` : el)

/***********************************************************************************************************************
 * Handle a file stream encountered within a ZIP file
 */
const handleGeonamesFile = (entry, countryCode, csv_path, etags_path, etag) =>
  // Is this the country's text file?
  entry.path === `${countryCode}.txt`
  // Yes...
  ? entry
      // Split the stream into lines
      .pipe(es.split(/\r?\n/))

      // Convert each line to CSV
      .pipe(es.map((line, callback) =>
        callback(null, `${line.split(/\t/).reduce(reduceColumns(geonamesDbCols), []).join(",")}\n`))
      )

      // Write the CSV lines to the country file
      .pipe(fs.createWriteStream(`${csv_path}${countryCode}.csv`))

      // When then the stream finishes, write the country's eTag value to file
      .on('finish', () => fs.writeFileSync(`${etags_path}${countryCode}.etag`, etag))

  // No, these are not the droids we're looking for, so clean up the stream...
  : entry.autodrain()


/**
 * =====================================================================================================================
 * Public API
 * =====================================================================================================================
 **/
module.exports = {
  handleGeonamesFile : handleGeonamesFile
}
