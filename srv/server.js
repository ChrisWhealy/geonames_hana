/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

/**
 * =====================================================================================================================
 * Geonames server
 * =====================================================================================================================
 */
const cds  = require('@sap/cds')
const http = require('http')
const fs   = require('fs')
const mime = require('mime-types')

const loader = require('./loader.js')
const config = require('./config/config.js')

const { typeOf
      , isOfType
      } = require('./utils/functional_tools.js')

const isPromise = isOfType("Promise")

const { validateUrl
      , subdivideUrl
      } = require('./utils/url_utils.js')

const { invokeApiInDb } = require('./utils/db_utils.js')

const { showLink
      , http400
      , buildLandingPage
      } = require('./utils/html_utils.js')

const vcapApp = JSON.parse(process.env.VCAP_APPLICATION)
const vcapSrv = JSON.parse(process.env.VCAP_SERVICES)
const port    = process.env.PORT || 3000

const connectionObj = {
  "kind": "hana"
, "model": "gen/csn.json"
, "credentials": (vcapSrv['hana'] || vcapSrv['hanatrial'])[0].credentials
}

const startedAt = Date.now()
const separator = "* * * * * * * * * * * * * * * * * * * * * * * * * * * * * *"

// Sort function based on 2-character ISO country code
const sortByCountryCode = (el1, el2) => el1.ISO2 < el2.ISO2 ? -1 : el1.ISO2 > el2.ISO2 ? 1 : 0

// List of server-side objects displayed on the debug screen
var serverSideObjectList = [
  {title: "cds",              value: cds}
, {title: "VCAP_SERVICES",    value: vcapSrv}
, {title: "VCAP_APPLICATION", value: vcapApp}
, {title: "NodeJS process",   value: process}
]

// ---------------------------------------------------------------------------------------------------------------------
// HTTP request handlers
// ---------------------------------------------------------------------------------------------------------------------
const httpErrorHandler = err => console.error(`An HTTP Error occurred\n${err.stack}`)

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Partial function that returns an API request handler for a given API config object
const genApiHandler =
  apiConfig =>
    (recognisedUrl, url) =>
      (validatedUrl =>
        // Are all the query string parameters valid?
        (validatedUrl.qsVals.reduce((acc, el) => acc && el.isValid, true))
        ? invokeApiInDb(apiConfig, validatedUrl)
        : new Promise((resolve, reject) => resolve(http400(validatedUrl)))
      )
      (validateUrl(recognisedUrl, subdivideUrl(url, recognisedUrl.url)))

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Assign request handler functions based on URL type
const assignRequestHandler =
  url =>
    config.urls[url].handler =
      // API handler
      config.urls[url].type === 'api'
        ? genApiHandler(config.urls[url])
        // Link handler
        : config.urls[url].type === 'link'
          ? showLink(url, serverSideObjectList)
          : null

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Generate a request handler functions to all the APIs and links in the config object
const genRequestHandler = () => {
  return new Promise(
    (resolve, reject) => {
      Object
        .keys(config.urls)
        .map(assignRequestHandler)
      
      resolve()
    }
  )}

// ---------------------------------------------------------------------------------------------------------------------
// Partial function that returns an HTTP request handler function with a built-in default response
// ---------------------------------------------------------------------------------------------------------------------
const httpRequestHandler =
  defaultResponse =>
    (req, res) => {
      let body = []

      req.on('err', httpErrorHandler)
        .on('data', chunk => body.push(chunk))
        .on('end',  ()    => {
          body = Buffer.from(body).toString('utf8')

          // Assume that we will be able to process this request just fine...
          res.statusCode = 200
          res.setHeader('Content-Type', 'text/html; charset=utf-8')

          // -----------------------------------------------------------------------------------------------------------
          // Do I recognise the request URL?
          if (req.url === "/") {
            // Yup, its the landing page
            res.end(defaultResponse)
          }
          // -----------------------------------------------------------------------------------------------------------
          else {
            // Try to locate the handler for this URL
            let recognisedUrl = Object
              .keys(config.urls)
              .reduce((acc, knownUrl) => req.url.startsWith(knownUrl) ? config.urls[knownUrl] : acc, null)

            // ---------------------------------------------------------------------------------------------------------
            // Is this URL one we specifically recognise?
            if (recognisedUrl) {
              switch (recognisedUrl.type) {
                // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
                case 'link':
                  recognisedUrl
                    .handler()
                    .then(result => res.end(result))
                  break

                // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
                case 'api':
                  let resultPromise = recognisedUrl.handler(recognisedUrl, req.url)
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  console.log(`resultPromise is of type ${typeOf(resultPromise)}`)

                  // If the SQL statement does not find anything, then we get back a weird empty Promise object, so we
                  // must first check whether there is a 'then' function to call
                  if (isPromise(resultPromise)) {
                    resultPromise.then(result => {
                      // If the result is a string, then its an error message
                      if (typeOf(result) === 'String') {
                        res.setHeader('Content-Type', 'text/html; charset=utf-8')
                        res.end(result)
                      }
                      else {
                        res.end(JSON.stringify(result))
                      }
                    })
                  }
                  else {
                    res.end('[]')
                  }

                  break

                // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
                default:
                  console.log(`That's weird, the request for ${req.url} was thought to be of type ${recognisedUrl.type}`)
                  res.end('[]')
              }
            }
            // ---------------------------------------------------------------------------------------------------------
            // Nope, so this could be simply a file request originating from index.html
            else {
              let fName    = `${__dirname}${req.url}`
              let response = ''

              if (fs.existsSync(fName)) {
                res.setHeader('Content-Type', mime.lookup(fName))
                response = fs.readFileSync(fName).toString('utf8')
              }
              else {
                console.log(`Can't find file ${fName}`)
                res.statusCode = 404
              }
              
              res.end(response)
            }
          }
        })
    }


// ---------------------------------------------------------------------------------------------------------------------
// Connect to HANA.  This must be done first, otherwise the cds object is unusable
// ---------------------------------------------------------------------------------------------------------------------
cds.connect(connectionObj)

  // -------------------------------------------------------------------------------------------------------------------
  // Create and assign the request handlers, then fetch the list of countries
  // -------------------------------------------------------------------------------------------------------------------
  .then(() => genRequestHandler())
  .then(() => cds.run('SELECT * FROM ORG_GEONAMES_BASE_GEO_COUNTRIES').catch(console.error))

  // -------------------------------------------------------------------------------------------------------------------
  // Start the HTTP server
  // -------------------------------------------------------------------------------------------------------------------
  .then(listOfCountries => {
    return new Promise((resolve, reject) => {
      // Create an HTTP server
      const server = http.createServer()

      // Sort the country list
      let countryList = listOfCountries.sort(sortByCountryCode)
      // ---------------------------------------------------------------------------------------------------------------
      // Define HTTP handler with default landing page
      server.on('request', httpRequestHandler(buildLandingPage(countryList.length)))
      //server.on('request', httpRequestHandler(fs.readFileSync(__dirname + '/index.html').toString('utf8')))
      server.listen(port, () => console.log(`Server running at https://${vcapApp.uris[0]}:${port}/`))
  
      // Pass the sorted list of countries through to the next promise
      resolve(countryList)
    })
  })

  // -------------------------------------------------------------------------------------------------------------------
  // For each country fetch its GeoName and Alternate Name ZIP files
  .then(listOfCountries => {
    console.log(`Fetching GeoName and Alternate Name ZIP files for ${listOfCountries.length} countries`)
    console.log(`Refresh period ${config.refresh_freq} minutes`)

    Promise
      .all(
        listOfCountries.map(
          el => loader.geonamesHandler(el).then((resolve, reject) => loader.altNamesHandler(el))
        )
      )
      .then(() => {
         console.log(separator)
         console.log(`Finished table refresh in ${new Date(Date.now() - startedAt).toTimeString().slice(0,8)} hh:mm:ss`)
         console.log(separator)
      })
      .catch(console.error)
  })

