#!/usr/bin/env node

/**
 * =====================================================================================================================
 * @fileOverview stream_to_csv
 * 
 * Convert a read stream containing a tab delimited text file to a corresponding CSV file with optional mapping omit
 * certain columns
 * =====================================================================================================================
 **/

const stream = require('stream')

/***********************************************************************************************************************
 * All the columns needed in the HANA table must be listed in order they appear in the tab-delimited text file
 * If a column in the text file is not needed in the HANA table, then that array entry must be set to 'undefined'
 */
var geonamesDbCols = [
  "GeonameId"
, "Name"
, undefined           // ASCII name not needed
, undefined           // Alternate names are stored in a seperate table
, "Latitude"
, "Longitude"
, "FeatureClass"
, "FeatureCode"
, "CountryCode"
, "CountryCodesAlt"
, "Admin3"
, "Admin1"
, "Admin2"
, "Admin4"
, "Population"
, "Elevation"
, "DEM"
, "Timezone"
, "LastModified"
]


// Useful functions
const push             = (arr, el) => (_ => arr)(arr.push(el))
const isNullOrUndef    = x => x === null || x === undefined
const isNotNullOrUndef = x => !isNullOrUndef(x)

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
 * Transform stream handler to convert a text file into a CSV file whose columns are defined in propList
 */
const text_to_csv = (() => {
  var cache = null

  return (chunk, propList) =>
    chunk.toString('utf8')
         .split(/\r?\n/)
         .map(line => 
            (propArray => 
              propArray.length === propList.length
              ? propArray.reduce(reduceColumns(propList), []).join(",")
              : cache === null
                ? (_ => null)(cache = line)
                : ((cachedLine, _) => cachedLine.split(/\t/).reduce(reduceColumns(propList), []).join(","))
                  (`${cache}${line}`, cache = null))
            (line.split(/\t/))
          )
         .join('\n')
  })()


/***********************************************************************************************************************
 * Transform stream handler for converting a geonames text file
 */
class TextToGeonameCSV extends stream.Transform {
  constructor(opts) {
    super(opts)
  }

  _transform(chunk, _, callback) {
    this.push(text_to_csv(chunk, geonamesDbCols))
    callback()
  }
}

/**
 * =====================================================================================================================
 * Public API
 * =====================================================================================================================
 **/
module.exports = {
  geonamesTextFile : (() => {
    var transformGeonamesFile = new TextToGeonameCSV()

    // Write a header line at the start of the CSV stream
    transformGeonamesFile.once('data', function(_) {
      this.push(`${geonamesDbCols.filter(isNotNullOrUndef).join(',')}\n`)
    })

    return transformGeonamesFile
  })()
}
