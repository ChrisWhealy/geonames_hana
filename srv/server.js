/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

/**
 * =====================================================================================================================
 * Geonames server
 * =====================================================================================================================
 */
const CDS  = require('@sap/cds')
const HTTP = require('http')
const FS   = require('fs')
const WS   = require('ws')
const MIME = require('mime-types')

const Loader = require('./loader.js')
const Config = require('./config/config.js')

const { typeOf
      , isOfType
      , isUndefined
      } = require('./utils/functional_tools.js')

const isPromise = isOfType("Promise")

const URL  = require('./utils/url_utils.js')
const DB   = require('./utils/db_utils.js')
const HTML = require('./utils/html_utils.js')

const vcapApp = JSON.parse(process.env.VCAP_APPLICATION)
const vcapSrv = JSON.parse(process.env.VCAP_SERVICES)
const port    = process.env.VCAP_APP_PORT || 3000

const connectionObj = {
  "kind": "hana"
, "model": "gen/csn.json"
, "credentials": (vcapSrv['hana'] || vcapSrv['hanatrial'])[0].credentials
}

// Sort function based on 2-character ISO country code
const sortByCountryCode = (el1, el2) => el1.ISO2 < el2.ISO2 ? -1 : el1.ISO2 > el2.ISO2 ? 1 : 0

// List of server-side objects displayed on the debug screen
var serverSideObjectList = [
//   {title: "CDS",              value: CDS}
  {title: "VCAP_SERVICES",      value: vcapSrv}
, {title: "VCAP_APPLICATION",   value: vcapApp}
, {title: "NodeJS environment", value: process.env}
]

// ---------------------------------------------------------------------------------------------------------------------
// HTTP and WS request handlers
// ---------------------------------------------------------------------------------------------------------------------
const httpErrorHandler = err => console.error(`An HTTP error occurred\n${err.stack}`)
const wsErrorHandler   = err => console.error(`A Web Socket error occurred\n${err.stack}`)

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Partial function that returns an API request handler for a given API config object
const genApiHandler =
  apiConfig =>
    (recognisedUrlConfig, requestUrl) =>
      (validatedUrl =>
        // Are all the query string parameters valid?
        (validatedUrl.qsVals.reduce((acc, qsVal) => acc && qsVal.isValid, true))
        ? DB.invokeApiInDb(apiConfig, validatedUrl)
        : new Promise((resolve, reject) => resolve(HTML.http400(validatedUrl)))
      )
      (URL.validateUrl(recognisedUrlConfig, requestUrl))

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Partial function that returns an API request handler for a given API config object
const genWsMsg      = msgType => msgPayload => JSON.stringify({type: msgType, payload : msgPayload})
const wsCountryList = genWsMsg('countryList')

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Partial function that returns an API request handler for a given API config object
const genWsHandler = apiConfig => "Dummy WS page"

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Assign request handler functions based on URL type
const assignRequestHandler =
  url =>
    Config.urls[url].handler =
      Config.urls[url].type === 'api'
        // API handler
        ? genApiHandler(Config.urls[url])
        : Config.urls[url].type === 'link'
          ? HTML.showLink(url, serverSideObjectList)
          : Config.urls[url].type === 'ws'
            // WebSocket handler
            ? genWsHandler(Config.urls[url])
            : null
            

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Generate request handler functions for all the APIs and links found in the Config object
const genRequestHandler =
  () =>
    new Promise((resolve, reject) => (_ => resolve())
                                     (Object.keys(Config.urls).map(assignRequestHandler)))

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

          let requestUrl = decodeURI(req.url)
          console.log(`Request URL: ${requestUrl}`)

          // -----------------------------------------------------------------------------------------------------------
          // Do I recognise the request URL?
          if (requestUrl === "/") {
            // Yup, its the landing page
            res.end(defaultResponse)
          }
          // -----------------------------------------------------------------------------------------------------------
          else {
            // Try to locate the handler for this URL
            let recognisedUrlConfig = Object
              .keys(Config.urls)
              .reduce((acc, knownUrl) => requestUrl.startsWith(knownUrl) ? Config.urls[knownUrl] : acc, null)

            // ---------------------------------------------------------------------------------------------------------
            // Is this URL one we specifically recognise?
            if (recognisedUrlConfig) {
              console.log(`Processing request for '${requestUrl}' of type '${recognisedUrlConfig.type}'`)

              switch (recognisedUrlConfig.type) {
                // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
                case 'link':
                  recognisedUrlConfig.handler().then(result => res.end(result))
                  break

                // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
                case 'api':
                  res.setHeader('Content-Type', 'application/json; charset=utf-8')

                  // If the SQL statement does not find anything, then we'll get back a weird empty object, so we must
                  // first check whether there is a 'then' function to call
                  let resultPromise = recognisedUrlConfig.handler(recognisedUrlConfig, requestUrl)

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
                  console.log(`That's weird, the request for ${requestUrl} was thought to be of type ${recognisedUrlConfig.type}`)
                  res.end('[]')
              }
            }
            // ---------------------------------------------------------------------------------------------------------
            // Nope, so this could be a request originating from an HTML file
            else {
              let fName    = `${__dirname}${requestUrl}`
              let response = ''

              if (FS.existsSync(fName)) {
                res.setHeader('Content-Type', MIME.lookup(fName))
                response = FS.readFileSync(fName).toString('utf8')
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
// WSS message handler
// ---------------------------------------------------------------------------------------------------------------------
const wsMsgHandler =
  (ws, countryList) =>
    msg => {
      switch(msg) {
        case "refreshCountryData":
          Loader.refreshCountryData(ws, countryList)
          break

        default:
          console.log(`Unknown message received from client: "${msg}"`)
      }
    }

// ---------------------------------------------------------------------------------------------------------------------
// Connect to HANA.  This must be done first, otherwise the CDS object is unusable
// ---------------------------------------------------------------------------------------------------------------------
CDS.connect(connectionObj)

  // -------------------------------------------------------------------------------------------------------------------
  // Create and assign the request handlers, then fetch the list of countries
  // -------------------------------------------------------------------------------------------------------------------
  .then(genRequestHandler)
  .then(() => CDS.run('SELECT * FROM ORG_GEONAMES_BASE_GEO_COUNTRIES').catch(console.error))

  // -------------------------------------------------------------------------------------------------------------------
  // Start the HTTP server
  // -------------------------------------------------------------------------------------------------------------------
  .then(listOfCountries =>
    new Promise((resolve, reject) => {
      // ---------------------------------------------------------------------------------------------------------------
      // Sort the country list
      let countryList = listOfCountries.sort(sortByCountryCode)

      // ---------------------------------------------------------------------------------------------------------------
      // Create HTTP and WS servers
      const http_server = HTTP.createServer()
      http_server.on('request', httpRequestHandler(HTML.buildLandingPage(countryList.length)))

      const wss_server = new WS.Server({ server: http_server })
      wss_server.on('connection', ws => {
        console.log('WS connection established')
        
        // Send the country list to the client when the WebSocket connection is first established
        ws.send(wsCountryList(countryList))

        ws.on('message', wsMsgHandler(ws, countryList))
        ws.on('close', () => console.log('WS connection closed'))
      })

      http_server.listen(port, () => console.log(`Server running at https://${vcapApp.uris[0]}:${port}/`))
    })
  )


