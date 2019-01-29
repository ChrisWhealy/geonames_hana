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
const { Writable } = require('stream')

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
    (entry, countryCode, csv_path, etag) => {
      // Is this the correct text file?
      if (entry.path === `${countryCode}.txt`) {
        var colNames = propList.filter(entry => !isNullOrUndef(entry))

        var outStream = new Writable({
          write (chunk, encoding, callback) {
            cds.run(`upsert ${propList[0] === "GeonameId" ? "ORG_GEONAMES_GEONAMES" : ""} (${colNames.join(",")}) values (${colNames.map(() => "?").join(",")}) with primary key`, chunk)
              .then(() => {
                callback()
              })
              .catch(console.error)
          }
        })
        
      // Yes...
        entry
          // Split the stream into lines
          .pipe(es.split(/\r?\n/))
    
          // Convert each line to CSV (this includes the column header data)
          .pipe(es.map((line, cb) => cb(null, line.split(/\t/).reduce(reduceUsing(propList), []))))
            
          /**
           * Write the stream to HANA
           **/
          .pipe(outStream)
      }
      else {
      // No, these are not the droids we're looking for, so clean up the stream...
        entry.autodrain()
      }
    }

/**
 * =====================================================================================================================
 * Public API
 * =====================================================================================================================
 **/
module.exports = {
  handleGeonamesFile       : handleTextFile(geonamesDbCols)
, handleAlternateNamesFile : handleTextFile(alternateNamesDbCols)
}



const outStream = new Writable({
  buffer: [],

  write (chunk, encoding, callback) {
    this.buffer.push(chunk)

    // TODO: Check how to write once last chunk is done and buffer contains data
    
    if (this.buffer.length < 1000) {
      callback()
      return
    }

    cds.run('UPSERT ....', this.buffer.slice(0))
      .then(() => {
        this.buffer = []
        callback()
      })
  } ,

  end () {
    
  }
})
