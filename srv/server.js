/**
 * =====================================================================================================================
 * Geonames servers
 * =====================================================================================================================
 */

const cds    = require('@sap/cds')
const http   = require('http')
const path   = require('path')
const bfu    = require('basic-formatting-utils')

bfu.set_depth_limit(4)

const config = require('./config/config.js')
const loader = require('./loader.js')

const csv_path      = path.join(__dirname, config.csv_dest_path)
const geonames_path = '/export/dump/'

const vcap_app = JSON.parse(process.env.VCAP_APPLICATION)
const port     = process.env.PORT || 3000

var resp_html = "No value yet"

// Create an HTTP server
const server = http.createServer((req, res) => {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/html')
  res.end(resp_html)
})

server.listen(port, () => console.log(`Server running at https://${vcap_app.uris[0]}:${port}/`))

/**
 ***********************************************************************************************************************
 * Read the CountryInfo.csv file and from it extract a list of all the 2-character ISO country codes
 */
// const countryList = fs.readFileSync(`${csv_path}CountryInfo.csv`, 'utf8')
//                       .split(/\r\n|\r|\n/)
//                       .map(line => line.slice(0, line.indexOf(",")))
//                       .slice(1)

// // Map file handlers across all required files
// countryList.map(loader.geonamesHandler)
// countryList.map(loader.altNamesHandler)

// // Retrieve the special files holding geonames info and alternate names that are not country specific
// loader.geonamesHandler("no-country")
// loader.altNamesHandler("no-country")

// Connect to HANA
cds.connect({
     "kind": "hana",
     "model": "gen/csn.json",
     "credentials": {
       "hana": {
         "name": "geonames-hdi"
       }
     }
   })
   .then(() => {
      // Generate placeholder HTTP response
      return new Promise((resolve, reject) => {
        resp_html = 
          bfu.as_html([]
          , bfu.as_body([]
            , [ bfu.create_content(
                [ {title: "cds",              value: cds}
                , {title: "VCAP_SERVICES",    value: JSON.parse(process.env.VCAP_SERVICES)}
                , {title: "VCAP_APPLICATION", value: vcap_app}
                , {title: "NodeJS process",   value: process}
                ])
              ].join("")
            )
          )

        resolve()
      })
   })
   .then(() => {
      console.log("Accessing GeoName files")
      loader.geonamesHandler("no-country")
   })




