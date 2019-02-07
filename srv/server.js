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
const styleSheet = require('./utils/style_sheet.js')

const { cdsModelDefinitions
      , cdsElObjToHtmlTable
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

var cdsModelDefs

// Display no more than 7 levels of nested objects
  bfu.set_depth_limit(7)

// Read a generic DB table
const promiseToReadTable = tableName => query => cds.run(`${query} FROM ${tableName}`).catch(console.error)

// Transform a table name from the config object into a paragraph containing a hypertext link
const tabNameAsLink =
  tabName =>
    bfu.as_p([], bfu.as_a([`href="${config.tables[tabName].url}"`], config.tables[tabName].description))

// ---------------------------------------------------------------------------------------------------------------------
// HTTP request handlers
// ---------------------------------------------------------------------------------------------------------------------
const httpErrorHandler = err => console.error(err.stack)

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// Build the default landing page using the URLs and descriptions found in the config object
const buildLandingPage = countryCount =>
  bfu.as_html(
    []
  , bfu.as_body(
      []
    , [ bfu.as_h1([],`GeoNames Server (${process.env.NODE_ENV})`)
      , bfu.as_p([], `Provides geopolitical data for ${countryCount} countries`)
      // Display each table name listed in the config object
      , Object
          .keys(config.tables)
          .map(tabNameAsLink)
          .join('')
      ].join('')
    )
  )

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// Function to display the contents of a generic DB table
// This function always reads the DB via a promise and returns a synchronous result
const show_table =
  (dbTabName, cdsTabName) =>
    // Anonymous partial function receives the table reader function (that returns a promise) and the CDS model defintion
    // of the table being read
    // This function returns a function that will read a given table using whatever query fragment is based as its
    // argument. Currently, there is no support for WHEN clauses
    ((tableReaderPromise, cdsModelDef) =>
      query =>
        tableReaderPromise(query)
          .then(tableContents => {
            console.log(`"${query} FROM ${dbTabName}" returned ${tableContents.length} rows`)
            return bfu.as_html(
                     []
                   , [ bfu.as_style([], styleSheet)
                     , bfu.as_body([], cdsElObjToHtmlTable(cdsModelDef, tableContents))
                     ].join('')
                   )
          })
    )
    // Generate the arguments for the above anonymous function
    (promiseToReadTable(dbTabName), cdsModelDefs(cdsTabName))

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// Show contents of various server-side object.
// This function is only used in a development environment
const show_server_objects = () => {
  return new Promise((resolve, reject) =>
    resolve(bfu.as_html(
              []
            , [ bfu.create_content([
                   {title: "cds",              value: cds}
                 , {title: "VCAP_SERVICES",    value: vcap_srv}
                 , {title: "VCAP_APPLICATION", value: vcap_app}
                 , {title: "NodeJS process",   value: process}
                 ])
              ].join("")
           )
    )
  )
}

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
            var handler = Object
              .values(urlWhiteList)
              .reduce((acc, el) => el.url === url ? el.handler : acc, null)

            // Could the handler be found?
            if (handler === null) {
              // Nope - these are not the droids we're looking for...
              res.statusCode = 404
              res.end(bfu.as_a(['href=/'], 'These are not the droids we&rsquo;re looking for...'))
            }
            else 
              // Deep joy! Invoke the handler for this URL
              handler('SELECT TOP 1000 *')
                .then(result => res.end(result))
            
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
    cdsModelDefs = cdsModelDefinitions(cds)

    // Assign the correct request handler to each table named in the configuration object
    Object
      .keys(config.tables)
      .map(tabName => {
        config.tables[tabName].handler = 
          // If we're running in development, then there will be an extra table name of 'debug'.
          // This is not a real DB table; therefore, it has its own specific request handler
          (tabName === 'debug')
          ? show_server_objects
          // Generate the handler for this table
          : show_table(
              config.tables[tabName].dbTableName
            , config.tables[tabName].cdsTableName
            )

        // Now that we know which handler is associated with which table, build up the list of while-listed URLS and
        // their handlers
        urlWhiteList.push({
          'url'     : config.tables[tabName].url
        , 'handler' : config.tables[tabName].handler
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
         console.log(`Finished: Runtime ${new Date(Date.now() - startedAt).toTimeString().slice(0,8)}`)
         console.log(separator)
      })
  })

