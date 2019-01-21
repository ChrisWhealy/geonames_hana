#!/usr/bin/env node

/**
 * =====================================================================================================================
 * Check all country files on GeoNames.org for changes.
 * If a change is detected, download that file and convert it into a CSV file
 * =====================================================================================================================
 */

const fs    = require('fs')
const unzip = require('unzip-stream')
const http  = require('http')

const csv_path = './db/src/csv/'
const txt_path = './db/src/txt/'

// ---------------------------------------------------------------------------------------------------------------------
// Read the CountryInfo.csv file and from it extract a list of all the 2-character ISO country codes
const countryList = fs.readFileSync(`${csv_path}CountryInfo.csv`, 'utf8')
                      .split(/\r\n|\r|\n/)
                      .map(line => line.slice(0, line.indexOf(",")))
                      .slice(1)

// ---------------------------------------------------------------------------------------------------------------------
// Read the etag file for the current country code, if it exists
const readEtag = countryCode =>
  (etagFile => fs.existsSync(etagFile) ? fs.readFileSync(etagFile).toString() : "")
  (`${txt_path}${countryCode}.etag`)

// ---------------------------------------------------------------------------------------------------------------------
// A specific HTTP Agent object is used to raise Node's default per-host socket limit from 5 to 10
const svcAgent = http.Agent({
  keepAlive  : true
, maxSockets : 10
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
        ? process.stdout.write(`unchanged\n`)
        // Yup, so did the download succeed?
        : response.statusCode === 200
          // Yup...
          // The argument to this inner function is always 'undefined' - see comments below
          ? (_ => {
            process.stdout.write(`unzipping... `)

              response.
                // Pipe the HTTP response through unzip
                pipe(unzip.Parse()).
                // When we encounter an inner file within the ZIP file
                on('entry'
                  , entry =>
                      // Is this the text file we're looking for?
                      entry.path === `${countryCode}.txt`
                      // Write the text file to disk
                      ? ((_, pathName) => entry.pipe(fs.createWriteStream(pathName)))
                        (process.stdout.write(`extracting ${countryCode}.txt\n`), `${txt_path}${countryCode}.txt`)
                      // This is a file we don't care about, so clean up the stream
                      : entry.autodrain()
                  )
              }
            )
            // Write the coutry's eTag value to a file and trap the return value from fs.writeFileSync (which is always
            // 'undefined') as a "don't care" parameter to the above inner function
            (fs.writeFileSync(`${txt_path}${countryCode}.etag`, response.headers.etag))
          : console.error(`HTTP status code ${response.statusCode} received for country code ${countryCode}`)
        }
        catch(err) {
          console.error(`HTTP error requesting ${countryCode}: ${err.toString()}`)
        }
      }
  )


// ---------------------------------------------------------------------------------------------------------------------
// Download all the country ZIP files
countryList.map(fetchCountryFile)

