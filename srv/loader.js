#!/usr/bin/env node

/**
 * =====================================================================================================================
 * Stream handler for very large text and CSV files
 * =====================================================================================================================
 */

const fs        = require('fs')
const unzip     = require('unzip-stream')
const http      = require('http')
const transform = require('./utils/transform')

const etags_path = '../db/src/etags/'
const csv_path   = '../db/src/csv/'

// ---------------------------------------------------------------------------------------------------------------------
// Read the CountryInfo.csv file and from it extract a list of all the 2-character ISO country codes
const countryList = fs.readFileSync(`${csv_path}CountryInfo.csv`, 'utf8')
                      .split(/\r\n|\r|\n/)
                      .map(line => line.slice(0, line.indexOf(",")))
                      .slice(1)

//var countryList = ["GB","AD","FR"]

// ---------------------------------------------------------------------------------------------------------------------
// Read the etag file for the current country code, if it exists
const readEtag = countryCode =>
  (etagFile => fs.existsSync(etagFile) ? fs.readFileSync(etagFile).toString() : "")
  (`${etags_path}${countryCode}.etag`)


// ---------------------------------------------------------------------------------------------------------------------
// Be careful, the connection to geonames.org becomes unreliable if you try to open too many parallel sockets
// Even NodeJS's default of 5 sometimes causes a socket hang up error...
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
      process.stdout.write(`Fetching ${countryCode}.zip... `)

      // The HTTP request might fail...
      try {
        // Has the file changed since we last accessed it?
        response.statusCode === 304
        // Nope
        ? console.log(`Skipping - unchanged since last access`)
        // Yup, so did the download succeed?
        : response.statusCode === 200
          // Yup, so unzip the HTTP response stream
          ? response
              .pipe(
                (_ => unzip.Parse())
                (process.stdout.write("unzipping... "))
              )
              // When we encounter a file within the unzipped stream, check if its a geonames text file
              .on('entry'
                 , entry => transform.handleGeonamesFile(entry, countryCode, csv_path, etags_path, response.headers.etag)
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
