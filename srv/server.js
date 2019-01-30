/**
 * =====================================================================================================================
 * Geonames servers
 * =====================================================================================================================
 */

const cds    = require('@sap/cds')
const xsenv  = require('@sap/xsenv')
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
 * Read the CountryInfo table from it extract a list of all the 2-character ISO country codes
 */

var GB = {"ISO2":"GB","ISO3":"GBR","ISONUMERIC":"826","FIPS":"UK","COUNTRYNAME":"United Kingdom","CAPITAL":"London","AREA":"244820.00","POPULATION":62348447,"TLD":".uk","CURRENCYCODE":"GBP","CURRENCYNAME":"Pound","DIALLINGCODE":"44","POSTALCODEFORMAT":"@# #@@|@## #@@|@@# #@@|@@## #@@|@#@ #@@|@@#@ #@@|GIR0AA","POSTALCODEREGEX":"^([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9]?[A-Za-z])))) [0-9][A-Za-z]{2})$","LANGUAGES":"en-GB,cy-GB,gd","NEIGHBOURS":"IE","CONTINENT_CONTINENTCODE":"EU","COUNTRYETAG":null,"ALTNAMESETAG":null}
var FR = {"ISO2":"FR","ISO3":"FRA","ISONUMERIC":"250","FIPS":"FR","COUNTRYNAME":"France","CAPITAL":"Paris","AREA":"547030.00","POPULATION":64768389,"TLD":".fr","CURRENCYCODE":"EUR","CURRENCYNAME":"Euro","DIALLINGCODE":"33","POSTALCODEFORMAT":"#####","POSTALCODEREGEX":"^(\\d{5})$","LANGUAGES":"fr-FR,frp,br,co,ca,eu,oc","NEIGHBOURS":"CH,DE,BE,LU,IT,AD,MC,ES","CONTINENT_CONTINENTCODE":"EU","COUNTRYETAG":null,"ALTNAMESETAG":null}

var testCountryList = [GB, FR]

// Connect to HANA
var services = xsenv.getServices({"hana": { "tag": "hana"}})

var connectionObj = {
  "kind": "hana"
, "model": "gen/csn.json"
, "credentials": services.hana
//, "credentials": {"hana": { "tag": "geonames-hdi"}}
}

// Connect to HANA
cds.connect(connectionObj)
   // Generate the placeholder HTTP server response
   .then(() => {
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
   // Fetch the list of countries along with the two eTags from the last time we fetched the country's ZIP file and the  
   // country's alternate names ZIP file
   .then(() => {
      console.log("Fetching list of countries")
      return cds.run('SELECT * FROM ORG_GEONAMES_BASE_GEO_COUNTRIES').catch(console.error)
   })
   .then(countryList => {
      console.log("Accessing GeoName files")
    //   console.log(`CountryList = ${JSON.stringify(countryList[75])}`)

      testCountryList.map(el => {
        loader.geonamesHandler(el)
        loader.altNamesHandler(el)
      })
   })




