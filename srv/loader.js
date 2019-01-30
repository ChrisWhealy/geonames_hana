/**
 * =====================================================================================================================
 * Stream handler for very large text and CSV files
 * =====================================================================================================================
 */

const fs        = require('fs')
const unzip     = require('unzip-stream')
const http      = require('http')
const path      = require('path')

const config         = require('./config/config.js')
const transform_csv  = require('./utils/transform_csv.js')
const transform_hana = require('./utils/transform_hana.js')

const csv_path      = path.join(__dirname, config.csv_dest_path)
const geonames_path = '/export/dump/'
const altnames_path = `${geonames_path}alternatenames/`

/**
 ***********************************************************************************************************************
 * Be careful, the connection to geonames.org becomes unreliable if you try to open too many parallel sockets
 * Even NodeJS's default of 5 sometimes causes a socket hang up error...
 */
const svcAgent = http.Agent({
  keepAlive  : true
, maxSockets : 5
})

// Construct the HTTP options object for reading from geonames.org using the agent created above
// Need to allow for the special country code XX which become "no-country"
const buildHttpOptions =
  (countryObj, geonamesPath) => ({
      hostname: 'download.geonames.org'
    , port: 80
    , path: `${geonamesPath}${(countryObj.ISO2) === "XX" ? "no-country" : countryObj.ISO2}.zip`
    , method: 'GET'
    , headers: {
        'If-None-Match': geonamesPath.indexOf("alternate") > -1 ? countryObj.ALTNAMESETAG : countryObj.COUNTRYETAG
      }
    , agent : svcAgent
    })

// Extract URL from request object
const getUrl = request => `${request.agent.protocol}//${request._headers.host}${request._header.split(" ")[1]}`

/**
 ***********************************************************************************************************************
 * Partial function to download a geonames ZIP file
 */
var fetchZipFile =
  (geonamesPath, textStreamHandler) =>
    countryObj =>
      http.get(
        buildHttpOptions(countryObj, geonamesPath)
      , response => {
          var sourceURL = getUrl(response.req)
          process.stdout.write(`Fetching ${sourceURL}... `)
  
          // -----------------------------------------------------------------------------------------------------------
          // The HTTP request might fail...
          try {
            // ---------------------------------------------------------------------------------------------------------
            // Has the file changed since we last accessed it?
            response.statusCode === 304
            // Nope
            ? console.log(`Skipping - unchanged since last access`)
            // Yup, so did the download succeed?
            : response.statusCode === 200
              // -------------------------------------------------------------------------------------------------------
              // Yup...
              ? response
                  // Unzip the HTTP response stream
                  .pipe((_ => unzip.Parse())
                        (process.stdout.write(`unzipping ${response.headers["content-length"]} bytes... `)))
                  // Then, when we encounter a file within the unzipped stream...
                  .on('entry'
                     , entry =>
                         // Is this the country's text file?
                         entry.path === `${countryObj.ISO2}.txt`
                         // Yup, so write its contents to HANA.  The text stream handler needs to know whether this file
                         // is a country ZIP file or an alternate names ZIP file and that file's eTag
                         ? textStreamHandler(entry, countryObj, (geonamesPath.indexOf("alternate") > -1), response.headers.etag)
                         // No, these are not the droids we're looking for...
                         : entry.autodrain()
                     )
              // -------------------------------------------------------------------------------------------------------
              // Meh, some other HTTP status code was received
              : console.error(`HTTP status code ${response.statusCode} received for request ${sourceURL}`)
            }
            // Boohoo! Its all gone horribly wrong...
            catch(err) {
              console.error(`HTTP error requesting ${sourceURL}: ${err.toString()}`)
            }
          }
      )

/**
 ***********************************************************************************************************************
 * Public API
 */

module.exports = {
  geonamesHandler : fetchZipFile(geonames_path, transform_hana.handleGeonamesFile)
, altNamesHandler : fetchZipFile(altnames_path, transform_hana.handleAlternateNamesFile)
}
