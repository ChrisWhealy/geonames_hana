/**
 * =====================================================================================================================
 * Stream handler for very large text and CSV files
 * =====================================================================================================================
 */

const fs        = require('fs')
const unzip     = require('unzip-stream')
const http      = require('http')
const path      = require('path')
const transform = require('./utils/transform')

const csv_path      = path.join(__dirname,'../db/src/csv/')
const geonames_path = '/export/dump/'

/**
 ***********************************************************************************************************************
 * Read the CountryInfo.csv file and from it extract a list of all the 2-character ISO country codes
 */
// const countryList = fs.readFileSync(`${csv_path}CountryInfo.csv`, 'utf8')
//                       .split(/\r\n|\r|\n/)
//                       .map(line => line.slice(0, line.indexOf(",")))
//                       .slice(1)

//var countryList = ["GB","AD","FR"]

/**
 ***********************************************************************************************************************
 * Read the etag file for the current file, if it exists
 */
const readEtag =
  pathname =>
    countryCode =>
      (etagFile => fs.existsSync(etagFile) ? fs.readFileSync(etagFile).toString() : "")
      (`${pathname}${countryCode}.etag`)


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
const buildHttpOptions =
  (targetPathname, geonamesPath) => 
    countryCode => ({
      hostname: 'download.geonames.org'
    , port: 80
    , path: `${geonamesPath}${countryCode}.zip`
    , method: 'GET'
    , headers: {
        'If-None-Match': readEtag(targetPathname)(countryCode)
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
  (targetPathname, geonamesPath, textStreamHandler) =>
    countryCode =>
      http.get(
        buildHttpOptions(targetPathname, geonamesPath)(countryCode)
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
                  .on('entry', entry => textStreamHandler(entry, countryCode, targetPathname, response.headers.etag))
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
  geonamesHandler : fetchZipFile(`${csv_path}countries/`, geonames_path, transform.handleGeonamesFile)
, altNamesHandler : fetchZipFile(`${csv_path}altnames/` , `${geonames_path}alternatenames/`, transform.handleAlternateNamesFile)
}

// var geonamesHandler = fetchZipFile(`${csv_path}countries/`, geonames_path, transform.handleGeonamesFile)
// var altNamesHandler = fetchZipFile(`${csv_path}altnames/` , `${geonames_path}alternatenames/`, transform.handleAlternateNamesFile)

// // Map file handlers across all required files
// countryList.map(geonamesHandler)
// countryList.map(altNamesHandler)

// // Retrieve the special files holding geonames info and alternate names that are not country specific
// geonamesHandler("no-country")
// altNamesHandler("no-country")
