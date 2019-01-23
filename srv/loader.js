#!/usr/bin/env node

/**
 * =====================================================================================================================
 * Check all country files on GeoNames.org for changes.
 * If a change is detected, download that file and convert it into a CSV file
 * =====================================================================================================================
 */

const fs         = require('fs')
const unzip      = require('unzip-stream')
const http       = require('http')
const txt_to_csv = require('../utils/transform')

const { Transform } = require('stream')

const csv_path = './db/src/csv/'
const txt_path = './db/src/txt/'

// ---------------------------------------------------------------------------------------------------------------------
// Read the CountryInfo.csv file and from it extract a list of all the 2-character ISO country codes
// const countryList = fs.readFileSync(`${csv_path}CountryInfo.csv`, 'utf8')
//                       .split(/\r\n|\r|\n/)
//                       .map(line => line.slice(0, line.indexOf(",")))
//                       .slice(1)

var countryList = ["US"]

// ---------------------------------------------------------------------------------------------------------------------
// All the columns needed in the HANA table must be listed in order they appear in the tab-delimited text file
// If a column in the text file is not needed in the HANA table, then that array entry must be set to 'undefined'
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

// ---------------------------------------------------------------------------------------------------------------------
// Read the etag file for the current country code, if it exists
const readEtag = countryCode =>
  (etagFile => fs.existsSync(etagFile) ? fs.readFileSync(etagFile).toString() : "")
  (`${txt_path}${countryCode}.etag`)

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
          // Yup...
          // The argument to this inner function is always 'undefined' - see comments below
          ? (_ =>
              // Pipe the HTTP response through unzip
              response.pipe(unzip.Parse())
                // When we encounter a file within the ZIP file
                .on('entry'
                  , entry =>
                      // Is this the text file we're looking for?
                      entry.path === `${countryCode}.txt`
                      ? (countryFile => 
                        // Yes, so pipe the stream to disk
                        entry.pipe(fs.createWriteStream(`${countryFile}.txt`))
                          // Wait for the write stream has finished
                          .on('finish'
                             , () => {
                                 // Write the country's eTag value to a file
                                 fs.writeFileSync(`${countryFile}.etag`, response.headers.etag)

                                 // Write the CSV file to disk
                                 fs.writeFileSync(
                                   `${csv_path}${countryCode}.csv`
                                   // Transform the text file into a CSV file
                                 , txt_to_csv.transform(fs.readFileSync(`${countryFile}.txt`, 'utf8'), geonamesDbCols)
                                 )

                                 console.log(`${csv_path}${countryCode}.csv created`)

                                 // Delete text file as its no longer required
                                 fs.unlink(
                                   `${countryFile}.txt`
                                 , err => err ? console.log(`Error deleting ${countryFile}.txt`) : undefined
                                 )
                               }
                             )
                        )
                        // Construct the pathname to this country's file without the extension!
                        (`${txt_path}${countryCode}`)
                      // This is a file we don't care about, so clean up the stream
                      : entry.autodrain()
                  )
            )()
          : console.error(`HTTP status code ${response.statusCode} received for country code ${countryCode}`)
        }
        catch(err) {
          console.error(`HTTP error requesting ${countryCode}: ${err.toString()}`)
        }
      }
  )


// ---------------------------------------------------------------------------------------------------------------------
// Download all the country ZIP files and extract the relevant text file
countryList.map(fetchCountryFile)

