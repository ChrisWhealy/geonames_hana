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

var alternateNamesDbCols = [
  "AlternateNameId", "GeonameId", "ISOLanguage", "AlternateName"
, "isPreferredName", "isShortName", "isColloquial", "isHistoric", "inUseFrom", "inUseTo"
]

/***********************************************************************************************************************
 * Useful functions
 **/
const push = (arr, el) => (_ => arr)(arr.push(el))

const isNullOrUndef = x => x === null || x === undefined

/***********************************************************************************************************************
 * Partial function that can be used with Array.reduce on one line of a text file to filter out unneeded columns
 * If a particular column value contains a comma, then this value must be delimited with double quotes
 */
const reduceUsing =
  propList =>
    (acc, el, idx) =>
      isNullOrUndef(propList[idx]) ? acc : push(acc, el.indexOf(",") > -1 ? `"${el}"` : el)


/***********************************************************************************************************************
 * Handle a text file stream encountered within a ZIP file
 */
const handleTextFile =
  propList =>
    (entry, countryCode, csv_path, etag) =>
      // Is this the correct text file?
      entry.path === `${countryCode}.txt`
      // Yes...
      ? entry
          // Split the stream into lines
          .pipe(es.split(/\r?\n/))
    
          // Convert each line to CSV (this includes the column header data)
          .pipe(es.map((line, cb) => cb(null, `${line.split(/\t/).reduce(reduceUsing(propList), []).join(",")}\n`)))
            
          /**
           * Write the stream to a CSV file
           *
           * Attaching the .once() handler to the write stream's 'pipe' event means that the column headers are injected
           * into the stream when the pipe is first opened - and before any other data comes down the pipe.
           * 
           * This means that the inline function invoked above by es.map() will also be invoked to process this column
           * header data.  Therefore, you have to take the somewhat redundant step of joining the column headers
           * together using tabs, only so this inline function can split them up again...
           **/
          .pipe(
            (_ => fs.createWriteStream(`${csv_path}${countryCode}.csv`)
                    .once('pipe', stream => stream.write(propList.join("\t"))))
            (console.log(`writing ${csv_path}${countryCode}.csv`))
          )
  
          // When then the stream finishes, write the eTag value to file
          .on('finish', () => fs.writeFileSync(`${csv_path}${countryCode}.etag`, etag))
    
      // No, these are not the droids we're looking for, so clean up the stream...
      : entry.autodrain()


/**
 * =====================================================================================================================
 * Public API
 * =====================================================================================================================
 **/
module.exports = {
  handleGeonamesFile       : handleTextFile(geonamesDbCols)
, handleAlternateNamesFile : handleTextFile(alternateNamesDbCols)
}
