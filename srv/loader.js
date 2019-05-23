/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

/**
 * =====================================================================================================================
 * Stream handler for very large text and CSV files
 * =====================================================================================================================
 */

const Unzip  = require('unzip-stream')
const HTTP   = require('http')
const Config = require('./config/config.js')
const HANA   = require('./utils/hana_transform.js')
const WS     = require('./utils/ws_utils.js')

const geonames_path  = '/export/dump/'
const altnames_path  = `${geonames_path}alternatenames/`

const startedAt = Date.now()
const separator = "* * * * * * * * * * * * * * * * * * * * * * * * * * * * * *"

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Handle the special case of country XX that does not map to country file XX.zip
const mapCountryCode = iso2 => iso2 === 'XX' ? 'no-country' : iso2

// How many whole minutes have elapsed since some particular time in the past?
const minutesBetweenNowAnd = then => Math.trunc((Date.now() - then) / 60000)

// Partial function that takes a refresh frequency (in minutes) and returns a function that checks for a given time in
// the past, whether or not the refresh period has expired
const refreshNeededAfter =
  refreshFrequency =>
    timeInThePast =>
      // If timeInThePast is falsey, then always assume the refresh period has expired
      timeInThePast ? minutesBetweenNowAnd(timeInThePast) > refreshFrequency : true

const refreshNeeded = refreshNeededAfter(Config.refreshFrequency)

/**
 ***********************************************************************************************************************
 * Be careful, the connection to geonames.org becomes unreliable if you try to open too many parallel sockets
 * Even NodeJS's default of 5 sometimes causes a socket hang up error...
 */
const svcAgent = HTTP.Agent({
  keepAlive  : true
, maxSockets : 5
})

// Construct the HTTP options object for reading from geonames.org using the agent created above
// Need to allow for the special country code XX which becomes the filename "no-country"
// Select the correct eTag value from the country object depending on whether this is a request for a country ZIP file
// or an alternate names ZIP file
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
    (ws, countryObj) => {
      // Are we fetching a country ZIP file or an alternate name ZIP file?
      let isAlternateNameFile = geonamesPath.indexOf("alternate") > -1
      let lastRefreshTime     = isAlternateNameFile ? countryObj.ALTNAMESETAGTIME : countryObj.COUNTRYETAGTIME

      let wsMsg = WS.genWsMsg(isAlternateNameFile ? 'altname' : 'country', countryObj.ISO2)

      return new Promise((resolve, reject) => {
        // Using the appropriate eTag time field, check whether or not a refresh is needed
        if (refreshNeeded(lastRefreshTime)) {
          HTTP.get(
            buildHttpOptions(countryObj, geonamesPath, isAlternateNameFile)
          , response => {
              var sourceURL = getUrl(response.req)
              ws.send(wsMsg(`Fetching ${sourceURL}`))
      
              // -----------------------------------------------------------------------------------------------------------
              // The HTTP request might fail...
              try {
                // ---------------------------------------------------------------------------------------------------------
                // Has the file changed since we last accessed it?
                response.statusCode === 304
                // Nope
                ? (_ => resolve())
                  (ws.send(wsMsg("Unchanged since last access")))
                // Yup, so did the download succeed?
                : response.statusCode === 200
                  // -------------------------------------------------------------------------------------------------------
                  // Yup...
                  ? response
                      // Unzip the HTTP response stream
                      .pipe((_ => Unzip.Parse())
                            (ws.send(wsMsg(`Unzipping ${response.headers["content-length"]} bytes`))))
                      // Then, when we encounter a file within the unzipped stream...
                      .on('entry'
                         , entry =>
                             // Is this the country's text file?
                             entry.path === `${mapCountryCode(countryObj.ISO2)}.txt`
                             // Yup, so write its contents to HANA
                             ? textStreamHandler(ws, entry, countryObj, isAlternateNameFile, response.headers.etag)
    
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
        }
        // This file does not need to be refreshed because the refresh period has not yet elapsed
        else {
          ws.send(wsMsg(`Refresh period elapses in ${Config.refreshFrequency - minutesBetweenNowAnd(lastRefreshTime)} minutes`))
          resolve()
        }
      })
    }

/**
 ***********************************************************************************************************************
 * Build file download handlers
 */
const geonamesHandler = fetchZipFile(geonames_path, HANA.handleGeonamesFile)
const altNamesHandler = fetchZipFile(altnames_path, HANA.handleAlternateNamesFile)


/**
 ***********************************************************************************************************************
 * Refresh Country Data
 */
const refreshCountryData =
  (ws, listOfCountries) => {
    console.log(`Fetching GeoName and Alternate Name ZIP files for ${listOfCountries.length} countries`)
    console.log(`Refresh period ${Config.refreshFrequency} minutes`)

    Promise
      .all(
        listOfCountries.map(
          el => geonamesHandler(ws, el).then((resolve, reject) => altNamesHandler(ws, el))
        )
      )
      .then(() => {
        console.log(separator)
        console.log(`Finished country data refresh in ${new Date(Date.now() - startedAt).toTimeString().slice(0,8)} hh:mm:ss`)
        console.log(separator)
      })
      .catch(console.error)
  }



/**
 ***********************************************************************************************************************
 * Public API
 */
module.exports = {
  refreshCountryData : refreshCountryData
}
