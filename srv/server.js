/**
 * =====================================================================================================================
 * Geonames server
 * =====================================================================================================================
 */
const cds       = require('@sap/cds')
const http      = require('http')
const bfu       = require('basic-formatting-utils')
const loader    = require('./loader.js')
const vcap_app  = JSON.parse(process.env.VCAP_APPLICATION)
const vcap_srv  = JSON.parse(process.env.VCAP_SERVICES)
const port      = process.env.PORT || 3000
const startedAt = Date.now()
const separator = "* * * * * * * * * * * * * * * * * * * * * * * * * * * * * *"

var resp_html = "No value yet"

bfu.set_depth_limit(4)

// ---------------------------------------------------------------------------------------------------------------------
// Create an HTTP server
// ---------------------------------------------------------------------------------------------------------------------
const server = http.createServer((req, res) => {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/html')
  res.end(resp_html)
})

server.listen(port, () => console.log(`Server running at https://${vcap_app.uris[0]}:${port}/`))

// ---------------------------------------------------------------------------------------------------------------------
// Connect to HANA
// ---------------------------------------------------------------------------------------------------------------------
var connectionObj = {
  "kind": "hana"
, "model": "gen/csn.json"
, "credentials": vcap_srv.hana[0].credentials
}

cds.connect(connectionObj)
  // -------------------------------------------------------------------------------------------------------------------
  // Generate the placeholder HTTP server response
  .then(() => {
    return new Promise((resolve, reject) => {
      resp_html = 
        bfu.as_html([]
        , bfu.as_body([]
          , [ bfu.create_content(
              [ {title: "VCAP_SERVICES",    value: vcap_srv}
              , {title: "VCAP_APPLICATION", value: vcap_app}
              // , {title: "NodeJS process",   value: process}
              ])
            ].join("")
          )
        )

      resolve()
    })
  })

  // -------------------------------------------------------------------------------------------------------------------
  // Fetch the list of countries
  .then(() => cds.run('SELECT * FROM ORG_GEONAMES_BASE_GEO_COUNTRIES').catch(console.error))

  // -------------------------------------------------------------------------------------------------------------------
  // For each country fetch its GeoName and Alternate Name ZIP files
  .then(countryList => {
    console.log(`Fetching GeoName and Alternate Name ZIP files for ${countryList.length} countries`)

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

