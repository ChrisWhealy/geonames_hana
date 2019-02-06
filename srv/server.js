/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

/**
 * =====================================================================================================================
 * Geonames server
 * =====================================================================================================================
 */
const cds       = require('@sap/cds')
const http      = require('http')
const bfu       = require('basic-formatting-utils')
const loader    = require('./loader.js')
const config    = require('./config/config.js')

const vcap_app        = JSON.parse(process.env.VCAP_APPLICATION)
const vcap_srv        = JSON.parse(process.env.VCAP_SERVICES)
const port            = process.env.PORT || 3000
const hanaCredentials = (vcap_srv['hana'] || vcap_srv['hanatrial'])[0].credentials
const startedAt       = Date.now()
const separator       = "* * * * * * * * * * * * * * * * * * * * * * * * * * * * * *"

const countryTable = 'org.geonames.base.geo.Countries'

  bfu.set_depth_limit(4)

// ---------------------------------------------------------------------------------------------------------------------
// HTTP request error handler function
// ---------------------------------------------------------------------------------------------------------------------
const httpErrorHandler = err => console.error(error.stack)

// ---------------------------------------------------------------------------------------------------------------------
// Partial function that defines an HTTP request handler function with a default response
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
          let responseBody
          body = Buffer.from(body).toString('utf8')

          console.log(`Received HTTP request with method ${method} and ${body.length === 0 ? 'no' : ''} body ${body}`)

          // What is the request asking for?
          switch(url) {
            case '/api/v1':
              responseBody = 'Nothing to see here, move along...'
              break

            default:
              responseBody = defaultResponse
          }

          res.statusCode = 200
          res.setHeader('Content-Type', 'text/html')
          res.end(responseBody)
        })

    }


// ---------------------------------------------------------------------------------------------------------------------
// Connect to HANA
// ---------------------------------------------------------------------------------------------------------------------
var connectionObj = {
  "kind": "hana"
, "model": "gen/csn.json"
, "credentials": hanaCredentials
}

cds.connect(connectionObj)
  // -------------------------------------------------------------------------------------------------------------------
  // Read all the countries from the DB
  // -------------------------------------------------------------------------------------------------------------------
  .then(() => cds.run('SELECT * FROM ORG_GEONAMES_BASE_GEO_COUNTRIES').catch(console.error))
  // -------------------------------------------------------------------------------------------------------------------
  // Start HTTP server
  // -------------------------------------------------------------------------------------------------------------------
  .then(countryList => {
    return new Promise((resolve, reject) => {
      let defaultResponse =
        bfu.as_html([]
        , bfu.as_body([]
          , [ bfu.create_content(
              [ {title: "cds",              value: cds}
              , {title: "VCAP_SERVICES",    value: vcap_srv}
              , {title: "VCAP_APPLICATION", value: vcap_app}
              , {title: "NodeJS process",   value: process}
              ])
            //   [ {title: "CountryList", value: countryList}
            //   ])
            ].join("")
          )
        )
  
      // Create an HTTP server
      const server = http.createServer()
      
      server.listen(port, () => console.log(`Server running at https://${vcap_app.uris[0]}:${port}/`))
      server.on('request', httpRequestHandler(defaultResponse))
  
      // Pass list of countries through to the next promise
      return countryList
    })
  })

  // -------------------------------------------------------------------------------------------------------------------
  // For each country fetch its GeoName and Alternate Name ZIP files
  .then(countryList => {
    console.log(`Fetching GeoName and Alternate Name ZIP files for ${countryList.length} countries`)
    console.log(`Refresh period ${config.refresh_freq} minutes`)

    Promise
      .all(
        countryList.map(
          el => loader.geonamesHandler(el).then((resolve, reject) => loader.altNamesHandler(el))
        )
      )
      .then(() => {
         console.log(separator)
         console.log(`Finished: Runtime ${new Date(Date.now() - startedAt).toTimeString().slice(0,8)}`)
         console.log(separator)
      })
  })

