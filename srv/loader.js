#!/usr/bin/env node

/**
 * =====================================================================================================================
 * Stream handler for very large text and CSV files
 * =====================================================================================================================
 */

const fs        = require('fs')
const unzip     = require('unzip-stream')
const http      = require('http')
const transform = require('../utils/transform')

const etags_path = '../db/src/etags/'
const csv_path   = '../db/src/csv/'

// ---------------------------------------------------------------------------------------------------------------------
// Read the CountryInfo.csv file and from it extract a list of all the 2-character ISO country codes
// const countryList = fs.readFileSync(`${csv_path}CountryInfo.csv`, 'utf8')
//                       .split(/\r\n|\r|\n/)
//                       .map(line => line.slice(0, line.indexOf(",")))
//                       .slice(1)

var countryList = ["GB"]

// ---------------------------------------------------------------------------------------------------------------------
// Read the etag file for the current country code, if it exists
const readEtag = countryCode =>
  (etagFile => fs.existsSync(etagFile) ? fs.readFileSync(etagFile).toString() : "")
  (`${etags_path}${countryCode}.etag`)


// ---------------------------------------------------------------------------------------------------------------------
// geonames.org *sometimes* lets you open 10 parallel sockets, but it could just hang up on you and then the whole
// program crashes.  Even Node's default of 5 parallel sockets sometimes is too much...
const svcAgent = http.Agent({
  keepAlive  : true
, maxSockets : 5
})

// Construct the HTTP options object for reading from geonames.org using the agent created above
const buildHttpOptions = countryCode => ({
    hostname: 'download.geonames.org'
  , port: 80
  , path: `/export/dump/${countryCode}.zip`
  , method: 'GET'
  , headers: {
      'If-None-Match': readEtag(countryCode)
    }
  , agent : svcAgent
})

// ---------------------------------------------------------------------------------------------------------------------
// Download the ZIP file for a specific country
var fetchCountryFile = countryCode =>
  http.get(
    buildHttpOptions(countryCode)
  , response => {
      console.log(`Fetching ${countryCode}.zip`)

      // The HTTP request might fail...
      try {
        // Has the file changed since we last accessed it?
        response.statusCode === 304
        // Nope
        ? console.log(`${countryCode}.zip unchanged`)
        // Yup, so did the download succeed?
        : response.statusCode === 200
          // Yup, so unzip the HTTP response
          ? response.pipe(unzip.Parse())
              // When we encounter a file within the ZIP file
              .on('entry'
                , entry =>
                    // Is this the country's text file?
                    entry.path === `${countryCode}.txt`
                    // Yes, so pipe the stream through the text-to-CSV transformer, then write the CSV file
                    ? entry
                        .pipe(transform.geonamesTextFile)
                        .pipe(fs.createWriteStream(`${csv_path}${countryCode}.csv`))
                        // When then the stream has finished, write the country's eTag value to file
                        .on('finish', () => fs.writeFileSync(`${etags_path}${countryCode}.etag`, response.headers.etag))
                    // These are not the droids we're looking for, so clean up the stream...
                    : entry.autodrain()
                )
          : console.error(`HTTP status code ${response.statusCode} received for country code ${countryCode}`)
        }
        catch(err) {
          console.error(`HTTP error requesting ${countryCode}: ${err.toString()}`)
        }
      }
  )

// ---------------------------------------------------------------------------------------------------------------------
// Fetch all the country files and transform them into CSV files
countryList.map(fetchCountryFile)
