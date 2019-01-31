/**
 * =====================================================================================================================
 * Stream handler for very large text and CSV files
 * =====================================================================================================================
 */

const fs    = require('fs')
const unzip = require('unzip-stream')
const http  = require('http')

const config         = require('./config/config.js')
const transform_hana = require('./utils/transform_hana.js')

const geonames_path = '/export/dump/'
const altnames_path = `${geonames_path}alternatenames/`

const mapCountryCode = iso2 => iso2 === 'XX' ? 'no-country' : iso2

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
// Need to allow for the special country code XX which becomes the filename "no-country"
// Select the correct eTag value from the country object depending on whether this is a request for a country ZIP file
// or alternate names ZIP file
const buildHttpOptions =
  (countryObj, geonamesPath, isAltName) => ({
    hostname: 'download.geonames.org'
  , port: 80
  , path: `${geonamesPath}${mapCountryCode(countryObj.ISO2)}.zip`
  , method: 'GET'
  , headers: {
      'If-None-Match': isAltName ? countryObj.ALTNAMESETAG : countryObj.COUNTRYETAG
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
    countryObj => {
      // Are we fetching a country ZIP file or an alternat name ZIP file?
      var isAlternateNameFile = geonamesPath.indexOf("alternate") > -1

      return new Promise((resolve, reject) =>
        http.get(
          buildHttpOptions(countryObj, geonamesPath, isAlternateNameFile)
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
              ? (_ => resolve())
                (process.stdout.write(`Skipping ${geonamesPath}${countryObj.ISO2}.zip - unchanged since last access\n`))
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
                           entry.path === `${mapCountryCode(countryObj.ISO2)}.txt`
                           // Yup, so write its contents to HANA
                           ? textStreamHandler(entry, countryObj, isAlternateNameFile, response.headers.etag).then(() => resolve())
  
                           // No, these are not the droids we're looking for..., so drain the stream and resolve the promise
                           : (_ => resolve())
                             (entry.autodrain())
                       )
                // -------------------------------------------------------------------------------------------------------
                // Meh, some other HTTP status code was received
                : (_ => resolve())
                  (console.error(`HTTP status code ${response.statusCode} received for request ${sourceURL}`))
              }
              // Boohoo! Its all gone horribly wrong...
              catch(err) {
                console.error(`HTTP error requesting ${sourceURL}: ${err.toString()}`)
                reject()
              }
            }
        )
      )
    }

/**
 ***********************************************************************************************************************
 * Public API
 */

module.exports = {
  geonamesHandler : fetchZipFile(geonames_path, transform_hana.handleGeonamesFile)
, altNamesHandler : fetchZipFile(altnames_path, transform_hana.handleAlternateNamesFile)
}
