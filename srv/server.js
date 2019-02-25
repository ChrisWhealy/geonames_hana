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
      , isString
      } = require('./utils/functional_tools.js')

const { showLink
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

// Display no more than 7 levels of nested objects
  bfu.set_depth_limit(7)

// ---------------------------------------------------------------------------------------------------------------------
// Parse a query string value
// No attempt here is made to validate the query string parameter value
// ---------------------------------------------------------------------------------------------------------------------
const parseQsValue =
  qsVal =>
    ((openIdx, closeIdx) =>
       // Minimal check to ensure that both open & close parenthesis characters are present
       (openIdx !== -1 && closeIdx !== -1)
       ? qsVal.substring(openIdx + 1, closeIdx).split(',')
       : qsVal)
    (qsVal.indexOf('('), qsVal.indexOf(')'))

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
          : updateObj(acc, item.substr(0, eqIdx), parseQsValue(item.substr(eqIdx+1)))
        )
        (item.indexOf('=')), {})

// ---------------------------------------------------------------------------------------------------------------------
// Subdivide the URL into zero or more keys and zero or more query string parameters
// ---------------------------------------------------------------------------------------------------------------------
const subdivideUrl =
  (requestUrl, templateUrl) =>
    (urlParts => ({
        keys    : urlParts[0].replace(templateUrl,'').split('/').filter(el => el.length > 0)
      , qs      : (urlParts.length === 2)
                  ? fetchQsParams(urlParts[urlParts.length - 1])
                  : {}
      })
    )
    // Split the URL at the '?', if there is one.
    // This will always result in an array containing at least one element
    (requestUrl.split('?'))

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


// ---------------------------------------------------------------------------------------------------------------------
// Validate the subdivided URL
// This function gives back everything needed either to process the request or reject it with an appropriate reason
// ---------------------------------------------------------------------------------------------------------------------
const validateUrl =
  (apiConfig, subdividedUrl) => {
    // Transform the mandatory query string parameter names into the corresponding table column names
    let dbProps = qsNameToDbProperties(apiConfig.parameters.mandatory, subdividedUrl.qs, {})

    return {
      // Are any mandatory query string parameters missing?
      missing : Object
                  .keys(apiConfig.parameters.mandatory)
                  .reduce((acc, paramName) => subdividedUrl.qs[paramName] ? acc : push(acc, paramName), [])

    // Transform the optional query string parameter names into the corresponding table column names
    , dbProps : qsNameToDbProperties(apiConfig.parameters.optional, subdividedUrl.qs, dbProps)

      // Pass the raw URL keys and query string back directly
    , keys    : subdividedUrl.keys
    , qs      : subdividedUrl.qs
    }
  }

// ---------------------------------------------------------------------------------------------------------------------
// Generate the operator and value parts of the SQL statement
// ---------------------------------------------------------------------------------------------------------------------
const genOpValue =
  (operators, qsVal) => {
    let retVal = 'NULL'

    console.log(`genOpValue(): operators = [${operators}], qsVal = ${qsVal}`)

    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // Is the 'operators' value a string?
    if (isString(operators)) {
      // Yup, is the query strring parameter value also a string
      if (isString(qsVal)) {
        // Yup, so return the simple case value
        retVal = `${operators} '${qsVal}'`
      }
      else {
        // Nope, so the query string value must be an array containing firstly the operator and secondly the value
        // This is a somewhat redunadant case since only the 'operators' value is just a string.  Nonetheless, the 
        // first element of query string value array must equal this one permitted operator value
        if (operators === qsVal[0]) {
          retVal = `${qsVal[0]} '${qsVal[1]}'`
        }
        else {
          console.log(`Error: malformed query string value ${qsVal}`)
        }
      }
    }
    // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    else {
      // Nope, so the 'operators' value is a Map
      if (isString(qsVal)) {
        // If a Map of operators is permitted, but the query string value is just a string, then assume the operator
        // must be '='
        retVal = `= '${qsVal}'`
      }
      else {
        // The query string value is an array and the operators value is a Map, so check that the operator listed in the
        // query string is a permitted operator listed in the 'operators' array
        if (operators.has(qsVal[0])) {
          retVal = `${operators.get(qsVal[0])} '${qsVal[1]}'`
        }
        else {
          console.log(`Error: Operator ${qsVal[0]} not permitted. Valid operators are '${operators}'`)
        }
      }
    }
    
    return retVal
  }
// ---------------------------------------------------------------------------------------------------------------------
// Generate generic query SQL statement
// ---------------------------------------------------------------------------------------------------------------------
const genSqlWhereClause =
  (validatedUrl, apiConfig) =>
    Object
      .keys(validatedUrl.dbProps)
      .reduce((acc,el) => {
          let thisProp = validatedUrl.dbProps[el]
          return push(acc, `"${thisProp.colName}" ${genOpValue(thisProp.operators, validatedUrl.qs[el])}`)
        }, [])
      .join(' AND ')

const genSqlSelect =
  (validatedUrl, apiConfig) =>
    (selectPart =>
      Object.keys(validatedUrl.qs).length === 0
      // Then just return the number of rows defined in the generic row limit
      ? `${selectPart};`
      // Else, add a WHERE clause
      : `${selectPart} WHERE "${genSqlWhereClause(validatedUrl, apiConfig)}';`)
    (`SELECT TOP ${apiConfig.rowLimit} * FROM ${apiConfig.dbTableName}`)

// ---------------------------------------------------------------------------------------------------------------------
// HTTP request handlers
// ---------------------------------------------------------------------------------------------------------------------
const httpErrorHandler = err => console.error(`An HTTP Error occurred\n${err.stack}`)

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Generate an API request handler for a given API config object
const genApiHandler =
  apiConfig =>
    validatedUrl => {
      // Are there any keys in the URL?
      let sql = (validatedUrl.keys.length > 0)
        // Yup, so this is a direct READ request which takes priority over a generic QUERY request
        // Does this request have no keys and no query string?
        ? `SELECT TOP ${config.genericRowLimit} * FROM ${apiConfig.dbTableName} WHERE "${apiConfig.keyField}"='${validatedUrl.keys[0]}';`

        // Nope, so this is a generic QUERY request.  By now, the validatedUrl object will contain at least the mandatory
        // parameters and zero or more of the optional parameters.  No other parameters will be present in this object
        : genSqlSelect(validatedUrl, apiConfig)
      
      console.log(`Executing SQL statement ${sql}`)

      return cds.run(sql).catch(console.error)
    }

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
// Generate a generic request handler function
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
//      console.log(`Server received request for URL ${req.url}`)

      req.on('err', httpErrorHandler)
        .on('data', chunk => body.push(chunk))
        .on('end',  ()    => {
          body = Buffer.from(body).toString('utf8')
//          console.log(`Received HTTP request with method ${req.method} and ${body.length === 0 ? 'no' : ''} body ${body}`)

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
//            console.log(`recognisedUrl = ${JSON.stringify(recognisedUrl)}`)

            // ---------------------------------------------------------------------------------------------------------
            // Is this URL one we specifically recognise?
            if (recognisedUrl) {
              switch (recognisedUrl.type) {
                // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
                case 'link':
                  recognisedUrl.handler().then(result => res.end(result))
                  break

                // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
                case 'api':
                  // Yup, then subdivide the request URL
                  let validatedUrl  = validateUrl(recognisedUrl, subdivideUrl(req.url, recognisedUrl.url))
//                  console.log(`validatedUrl = ${JSON.stringify(validatedUrl)}`)

                  // Look for reasons to reject this request
                  // Is keys array empty?
                  if (validatedUrl.keys.length === 0) { 
                    // Yup, so for this to be a valid QUERY, the query string must either be empty, or missing none of
                    // its mandatory parameters
                    if (Object.keys(validatedUrl.qs).length === 0 ||
                        validatedUrl.missing.length         === 0) {
                      // This is a valid QUERY request
                      res.setHeader('Content-Type', 'application/json; charset=utf-8')
                      recognisedUrl.handler(validatedUrl).then(result => res.end(JSON.stringify(result)))
                    }
                    else {
                      // Oops, this is a bad request because one or more mandatory query string parameters are missing
                      res.statusCode = 400
                      res.end(bfu.as_h2([],`The following mandatory parameters are missing from the request: ${validatedUrl.missing.join(', ')}`))
                    }
                  }
                  else {
                    // Nope, so treat this as a direct READ request, in which case, the query string parameters will be
                    // ignored
                    res.setHeader('Content-Type', 'application/json; charset=utf-8')
                    recognisedUrl.handler(validatedUrl).then(result => res.end(JSON.stringify(result)))
                  }

                  break

                // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
                default:
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

