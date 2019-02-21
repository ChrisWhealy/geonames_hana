/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

/**
 * =====================================================================================================================
 * Geonames server
 * =====================================================================================================================
 */
const cds    = require('@sap/cds')
const http   = require('http')
const fs     = require('fs')
const mime   = require('mime-types')
const bfu    = require('basic-formatting-utils')

const loader   = require('./loader.js')
const config   = require('./config/config.js')

const { push
      , updateObj
      } = require('./utils/functional_tools.js')

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
// Get query string parameters from incoming request object
// Just for a giggle, I wrote this function such that it only ever uses single expressions; hence no internal variables
// are declared.  Instead, anonymous inner functions are used and any needed internal variables become function
// parameters whose values are bound when the function is called
// ---------------------------------------------------------------------------------------------------------------------
const fetchQsParams =
  qs =>
    qs.split('&').reduce((acc, item) =>
        (eqIdx =>
          eqIdx === -1
          ? updateObj(acc, item, '')
          : updateObj(acc, item.substr(0, eqIdx), item.substr(eqIdx+1))
        )
        (item.indexOf('=')), {})

// ---------------------------------------------------------------------------------------------------------------------
// Partial function to check that a query string contains at least the required mandatory parameters
// Returns a function that can be used by Array.reduce()
// ---------------------------------------------------------------------------------------------------------------------
const qsParamCheck =
  qs =>
    (acc, requiredEl) =>
      qs[requiredEl]
      ? updateObj(acc, 'ok', true && acc.ok)
      : (_ => updateObj(acc, 'ok', false))
        (acc.missing.push(requiredEl))

// ---------------------------------------------------------------------------------------------------------------------
// Extract all the keys and query string parameters from the URL
// No attempt is made here to validate these values
// ---------------------------------------------------------------------------------------------------------------------
const parseUrl =
  (requestUrl, templateUrl) =>
    (urlParts => ({
        keys    : urlParts[0].replace(templateUrl,'').split('/').filter(el => el.length > 0)
      , qs      : fetchQsParams(urlParts[urlParts.length - 1])
      })
    )
    // Split the URL at the '?', if there is one
    (requestUrl.split('?'))


// ---------------------------------------------------------------------------------------------------------------------
// Minimum check that the query string contains at least the mandatory parameters
// ---------------------------------------------------------------------------------------------------------------------
const validateQs =
  (qsParameters, parsedUrl) =>
    Object
      .keys(qsParameters.mandatory)
      .reduce((acc,el) => parsedUrl.qs[el] ? acc : push(acc, el), [])

// ---------------------------------------------------------------------------------------------------------------------
// For a given paramater object, return the DB table column names and operators values that correspond to the query
// string parameter names
// ---------------------------------------------------------------------------------------------------------------------
const qsNameToDbProperties =
  (paramObj, qs, targetObj) =>
    Object.keys(paramObj).reduce(
      (acc, el) => qs[el] ? updateObj(acc, el, paramObj[el]) : acc
    , targetObj
    )

const genSqlSelect =
  (parsedUrl, apiConfig) => {
    // Transform the query string parameter names into the corresponding table column names
    let dbProps = qsNameToDbProperties(apiConfig.parameters.mandatory, parsedUrl.qs, {})
        dbProps = qsNameToDbProperties(apiConfig.parameters.optional,  parsedUrl.qs, dbProps)

    console.log(`dbProps = ${JSON.stringify(dbProps)}`)

    let whereClause = Object
          .keys(dbProps)
          .reduce((acc,el) => push(acc, `"${dbProps[el].colName}" ${dbProps[el].operators} '${parsedUrl.qs[el]}'`), [])
          .join(' AND ')

    let sql = `SELECT TOP ${apiConfig.rowLimit} * FROM ${apiConfig.dbTableName} WHERE ${whereClause};`

    return sql
  }

// ---------------------------------------------------------------------------------------------------------------------
// HTTP request handlers
// ---------------------------------------------------------------------------------------------------------------------
const httpErrorHandler = err => console.error(`An HTTP Error occurred\n${err.stack}`)

// ---------------------------------------------------------------------------------------------------------------------
// Generate an API request handler for a given API config object
// ---------------------------------------------------------------------------------------------------------------------
const genApiHandler =
  apiConfig =>
    (req, parsedUrl) => {
      // By the time we get to here, the parsedUrl object will contain at least the mandatory query string parameters.
      // Now remove any other parameters that are not found in the optional parameters list.  This is because we have no
      // means of translating an arbitrary query string parameter name to the corresponding table column name
      parsedUrl.qs = Object
        .keys(parsedUrl.qs)
        .reduce((acc, el) =>
            // If the parameter in the query string is listed as either an optional or mandatory parameter, then add it
            // to the accumulator, else skip it
            apiConfig.parameters.optional[el] || apiConfig.parameters.mandatory[el]
            ? updateObj(acc, el, parsedUrl.qs[el])
            : acc
          , {})

      // Are there any keys in the URL?
      let sql = (parsedUrl.keys.length > 0)
        // Yup, so this is a direct READ request which takes priority over a generic QUERY request
        ? `SELECT * FROM ${apiConfig.dbTableName} WHERE "${apiConfig.keyField}"='${parsedUrl.keys[0]}';`
        // Nope, so this is a generic QUERY request.  By now, the parsedURL object will contain at least the mandatory
        // parameters and zero or more of the optional parameters.  No other parameters will be present in this object
        : genSqlSelect(parsedUrl, apiConfig)
      
      console.log(`Executing SQL statement ${sql}`)

      return cds.run(sql).catch(console.error)
    }


// ---------------------------------------------------------------------------------------------------------------------
// Partial function that returns an HTTP request handler function with a default response
// ---------------------------------------------------------------------------------------------------------------------
const httpRequestHandler =
  defaultResponse =>
    (req, res) => {
      let body = []

      console.log(`Server received request for URL ${req.url}`)

      req.on('err', httpErrorHandler)
        .on('data', chunk => body.push(chunk))
        .on('end',  ()    => {
          body = Buffer.from(body).toString('utf8')

          console.log(`Received HTTP request with method ${req.method} and ${body.length === 0 ? 'no' : ''} body ${body}`)

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
            let urlHandler = Object
              .values(urlWhiteList)
              .reduce((acc, whiteList) => req.url.startsWith(whiteList.url) ? whiteList : acc, null)

            // ---------------------------------------------------------------------------------------------------------
            // Do we have a handler for this URL?
            if (urlHandler) {
              if (urlHandler.handler === null) {
                // Nope - these are not the droids we're looking for...
                res.statusCode = 404
                res.end(genLink('href=/', 'These are not the droids we&rsquo;re looking for...'))
              }
              // -------------------------------------------------------------------------------------------------------
              else {
                // -----------------------------------------------------------------------------------------------------
                // API handler
                if (urlHandler.type === 'api') {
                  // Yup, then parse the request URL
                  let parsedUrl      = parseUrl(req.url, urlHandler.url)
                  let missingQsParms = validateQs(urlHandler.parameters, parsedUrl)
                  
                  console.log(`parsedUrl = ${JSON.stringify(parsedUrl)}`)

                  // Look for reasons to reject this request
                  // Is keys array empty?
                  if (parsedUrl.keys.length === 0) { 
                    // Yup, so check if the query string is also empty?
                    if (Object.keys(parsedUrl.qs).length === 0) {
                      // Yup, so this is a bad request
                      res.statusCode = 400
                      res.end(bfu.as_h2([],`Unable to process request ${req.url}<br>Please specify either a key or a query string`))
                    }
                    // So there must be at least one item in the query string
                    // Are any of the mandatory query string parameters missing?
                    else if (missingQsParms.length > 0) {
                      // Yup, so this is also a bad request
                      res.statusCode = 400
                      res.end(bfu.as_h2([],`The following mandatory parameters are missing from the request: ${missingQsParms.join(', ')}`))
                    }
                    else {
                      // Nope, so this is a valid QUERY request
                      res.setHeader('Content-Type', 'application/json; charset=utf-8')
                      urlHandler.handler(req, parsedUrl).then(result => res.end(JSON.stringify(result)))
                    }
                  }
                  else {
                    // Nope, so treat this as a direct READ request, in which case, the query string parameters will be
                    // ignored
                    res.setHeader('Content-Type', 'application/json; charset=utf-8')
                    urlHandler.handler(req, parsedUrl).then(result => res.end(JSON.stringify(result)))
                  }
                }
                // -----------------------------------------------------------------------------------------------------
                // Table handler
                else if (urlHandler.type === 'table') {
                  urlHandler.handler('SELECT TOP 1000 *').then(result => res.end(result))
                }
                // -----------------------------------------------------------------------------------------------------
                // Link handler
                else if (urlHandler.type === 'link') {
                  urlHandler.handler().then(result => res.end(result))
                }
              }
            }
            // ---------------------------------------------------------------------------------------------------------
            // Nope, so this could be simply a file request originating from index.html
            else {
              let fName = `${__dirname}${req.url}`

              if (fs.existsSync(fName)) {
                res.setHeader('Content-Type', mime.lookup(fName))
                res.end(fs.readFileSync(fName).toString('utf8'))
              }
              else {
                console.log(`Can't find file ${fName}`)
                res.statusCode = 404
                res.end("")
              }
            }
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
    // Assign table request handler
    Object
      .keys(config.tables)
      .map(tabName => {
        // Generate the handler for displaying a table
        config.tables[tabName].handler = 
          showTable(config.tables[tabName].dbTableName, cdsModelDefinitions(cds)(config.tables[tabName].cdsTableName))

        // Add the table handler to the while-listed URLS
        urlWhiteList.push({
          'url'     : config.tables[tabName].url
        , 'handler' : config.tables[tabName].handler
        , 'type'    : 'table'
        })
      })

    // -----------------------------------------------------------------------------------------------------------------
    // Assign URL request handlers
    Object
      .keys(config.links)
      .map(linkName => {
        config.links[linkName].handler = 
          // If we're running in development, then there will be an link name of 'debug'.
          // This is not a real DB table; therefore, it has its own specific request handler
          (linkName === 'debug')
          ? showServerObjects(serverSideObjectList)
          // Generate the handler for this link
          : showLink(config.links[linkName].url)

        // Add the link handler to the while-listed URLS
        urlWhiteList.push({
          'url'     : config.links[linkName].url
        , 'handler' : config.links[linkName].handler
        , 'type'    : 'link'
        })
      })

    // -----------------------------------------------------------------------------------------------------------------
    // Assign API request handlers
    Object
      .keys(config.api)
      .map(apiName => {
        config.api[apiName].handler = genApiHandler(config.api[apiName])

        // Add the API handler to the while-listed URLS
        urlWhiteList.push({
          'url'        : config.api[apiName].url
        , 'handler'    : config.api[apiName].handler
        , 'parameters' : config.api[apiName].parameters
        , 'type'       : 'api'
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
      //server.on('request', httpRequestHandler(fs.readFileSync(__dirname + '/index.html').toString('utf8')))
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

