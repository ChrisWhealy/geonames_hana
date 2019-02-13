/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

/**
 * =====================================================================================================================
 * Geonames server
 * =====================================================================================================================
 */
const cds        = require('@sap/cds')
const http       = require('http')
const bfu        = require('basic-formatting-utils')
const loader     = require('./loader.js')
const config     = require('./config/config.js')

const { cdsModelDefinitions
      , showTable
      , showLink
      , genLink
      , buildLandingPage
      , showServerObjects
      } = require('./utils/html_utils.js')

const vcap_app = JSON.parse(process.env.VCAP_APPLICATION)
const vcap_srv = JSON.parse(process.env.VCAP_SERVICES)
const port     = process.env.PORT || 3000

const connectionObj = {
  "kind": "hana"
, "model": "gen/csn.json"
, "credentials": (vcap_srv['hana'] || vcap_srv['hanatrial'])[0].credentials
}

const startedAt = Date.now()
const separator = "* * * * * * * * * * * * * * * * * * * * * * * * * * * * * *"

// Sort function based on 2-character ISO country code
const sortByCountryCode = (el1, el2) => el1.ISO2 < el2.ISO2 ? -1 : el1.ISO2 > el2.ISO2 ? 1 : 0

var countryList  = []
var urlWhiteList = []

// List of server-side objects displayed on the debug screen
var serverSideObjectList = [
  {title: "cds",              value: cds}
, {title: "VCAP_SERVICES",    value: vcap_srv}
, {title: "VCAP_APPLICATION", value: vcap_app}
, {title: "NodeJS process",   value: process}
]

// Display no more than 7 levels of nested objects
  bfu.set_depth_limit(7)

// ---------------------------------------------------------------------------------------------------------------------
// HTTP request handlers
// ---------------------------------------------------------------------------------------------------------------------
const httpErrorHandler = err => console.error(err.stack)

// ---------------------------------------------------------------------------------------------------------------------
// Partial function that returns an HTTP request handler function with a default response
// ---------------------------------------------------------------------------------------------------------------------
const httpRequestHandler =
  defaultResponse =>
    (req, res) => {
      const { method, url } = req
      let body = []

      console.log(`Server received request for URL ${url}`)

      req.on('err', httpErrorHandler)
        .on('data', chunk => body.push(chunk))
        .on('end',  ()    => {
          body = Buffer.from(body).toString('utf8')

          console.log(`Received HTTP request with method ${method} and ${body.length === 0 ? 'no' : ''} body ${body}`)

         // Assume that we will be able to process this request just fine...
         res.statusCode = 200
         res.setHeader('Content-Type', 'text/html; charset=utf-8')

          // Do I recognise the request URL?
          if (url === "/") {
            // Yup, its the landing page
            res.end(defaultResponse)
          }
          else {
            // Try to locate the handler for this URL
            let urlHandler = Object
              .values(urlWhiteList)
              .reduce((acc, el) => el.url === url ? el : acc, null)

            // Do we have a handler for this URL?
            if (urlHandler.handler === null) {
              // Nope - these are not the droids we're looking for...
              res.statusCode = 404
              res.end(genLink('href=/', 'These are not the droids we&rsquo;re looking for...'))
            }
            else
              // Yup, so invoke the request handler
              // If the handler is of type 'table', then pass it the generic SQL query fragment
              // Otherwise, its a link handler, so pass it the name of the URL being invoked
              urlHandler.handler(
                  (urlHandler.type === 'table')
                  ? 'SELECT TOP 1000 *'
                  : urlHandler.url
              ).then(result => res.end(result))
          }
        })
    }


// ---------------------------------------------------------------------------------------------------------------------
// Connect to HANA.  This must be done first, otherwise the cds object is unusable
// ---------------------------------------------------------------------------------------------------------------------
cds.connect(connectionObj)

  // -------------------------------------------------------------------------------------------------------------------
  // Now that the cds object has become usable, create various other functions and objects that rely upon it
  // -------------------------------------------------------------------------------------------------------------------
  .then(() => {
    // -----------------------------------------------------------------------------------------------------------------
    // Assign the correct request handler to each table named in the 'tables' section of the configuration object
    Object
      .keys(config.tables)
      .map(tabName => {
        // Generate the handler for displaying a table
        config.tables[tabName].handler = 
          showTable(config.tables[tabName].dbTableName, cdsModelDefinitions(cds)(config.tables[tabName].cdsTableName))

        // Now that we know which handler is associated with which table, build up the list of while-listed URLS and
        // their handlers
        urlWhiteList.push({
          'url'     : config.tables[tabName].url
        , 'handler' : config.tables[tabName].handler
        , 'type'    : 'table'
        })
      })

    // -----------------------------------------------------------------------------------------------------------------
    // Assign the correct request handler to each URL named in the 'links' section of the configuration object
    Object
      .keys(config.links)
      .map(linkName => {
        config.links[linkName].handler = 
          // If we're running in development, then there will be an extra table name of 'debug'.
          // This is not a real DB table; therefore, it has its own specific request handler
          (linkName === 'debug')
          ? showServerObjects(serverSideObjectList)
          // Generate the handler for this link
          : showLink(config.links[linkName].url)

        // Now that we know which handler is associated with which table, build up the list of while-listed URLS and
        // their handlers
        urlWhiteList.push({
          'url'     : config.links[linkName].url
        , 'handler' : config.links[linkName].handler
        , 'type'    : 'link'
        })
      })

    return cds.run('SELECT * FROM ORG_GEONAMES_BASE_GEO_COUNTRIES').catch(console.error)
  })

  // -------------------------------------------------------------------------------------------------------------------
  // Start the HTTP server
  // -------------------------------------------------------------------------------------------------------------------
  .then(listOfCountries => {
    return new Promise((resolve, reject) => {
      countryList  = listOfCountries.sort(sortByCountryCode)
      
      // Create an HTTP server
      const server = http.createServer()
      
      // Define HTTP handler with default landing page
      server.on('request', httpRequestHandler(buildLandingPage(countryList.length)))
      server.listen(port, () => console.log(`Server running at https://${vcap_app.uris[0]}:${port}/`))
  
      // Pass the list of countries through to the next promise
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
  })

