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
 * A list of all column names found in a geonames country file. These names must match the names of the columns in the
 * HANA DB table.
 * 
 * If a column in the text file is not needed in the database, then the column name must be set to undefined
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
 * Partial function that can be used with Array.reduce on one line of a text file to filter out unneeded columns
 * If a particular column value contains a comma, then this value must be delimited with double quotes
 */
const reduceColumns =
  propList =>
    (acc, el, idx) =>
      isNullOrUndef(propList[idx]) ? acc : push(acc, el.indexOf(",") > -1 ? `"${el}"` : el)

/***********************************************************************************************************************
 * Handle a geonames text file stream encountered within a ZIP file
 */
const handleGeonamesFile = (entry, countryCode, csv_path, etag) =>
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
      .pipe(
        (_ => fs.createWriteStream(`${csv_path}${countryCode}.csv`))
        (console.log(`writing ${countryCode}.csv`))
      )

      // When then the stream finishes, write the country's eTag value to file
      .on('finish', () => fs.writeFileSync(`${csv_path}${countryCode}.etag`, etag))

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
