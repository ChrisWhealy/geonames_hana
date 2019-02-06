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

const { push } = require('./utils/functional_tools.js')

const vcap_app        = JSON.parse(process.env.VCAP_APPLICATION)
const vcap_srv        = JSON.parse(process.env.VCAP_SERVICES)
const port            = process.env.PORT || 3000
const hanaCredentials = (vcap_srv['hana'] || vcap_srv['hanatrial'])[0].credentials
const startedAt       = Date.now()
const separator       = "* * * * * * * * * * * * * * * * * * * * * * * * * * * * * *"
const countryTable    = 'org.geonames.base.geo.Countries'


// Return an HTML span element containing some text and a mouseover description
const asSpanWithDesc = (txt, desc) => bfu.as_span([`title="${desc}"`], txt)

// Return an HTML td element containing a value from the HANA table
const asTableData = tdValue => bfu.as_td(["class='bfu-td'"], tdValue)

// Retrieve the elements of a given table from the CDS model
// If the table name cannot be found, return an empty array
const cdsModelDefinitions =
  cdsObj =>
    tabName =>
      (tab => tab === undefined ? [] : tab.elements)
      (cdsObj.model.definitions[tabName])

// Transform the element property objects into an array, then sort that array into column number order
const sortModelElements =
  elementObj =>
    Object
      .keys(elementObj)
      .reduce((acc, element) => push(acc, elementObj[element]), [])
      .sort((el1, el2) => el1.indexNo < el2.indexNo)

// Transform a CDS Model elements object into a row of HTML table header elemnts
const tableHdrs =
  cdsModelDef =>
    (sortedEls =>
      bfu.as_tr( []
               , sortedEls
                   .reduce((acc, el) =>
                           // Ignore fields of type 'cds.Association'
                           (el.type === 'cds.Association')
                           ? acc
                           : ((descr, label) =>
                              // If the description is missing, the OData foreign key property instead
                              descr === undefined
                              ? push(acc, bfu.as_th( ["class='bfu-th'"], el['@odata.foreignKey4']))
                              : push(acc, bfu.as_th( ["class='bfu-th'"], asSpanWithDesc(label['='], descr['='])))
                             )
                             // Create a column header from the description and label fields
                             (el['@description'],el['@Common.Label'])
                           , [])
                   .join('')
               )
    )
    // Sort the elements in the CDS model definition into column order
    (sortModelElements(cdsModelDef))

// Transform an array of objects read from a HANA table into the corresponding HTML table rows. The columns must be
// ordered according to the indexNo property in the CDS Model elements object
const tableBody =
  (cdsModelDef, tableData) =>
    (sortedEls =>
      tableData
        .map(rowData =>
               bfu.as_tr( []
                        , sortedEls
                            .reduce((acc, el) =>
                                      (el.type === 'cds.Association')
                                      ? acc
                                      : push(acc, asTableData(rowData[el['@cds.persistence.name']])), [])
                            .join('')
                        )
            )
        .join('')
    )
    // Sort the elements in the CDS model definition into column order
    (sortModelElements(cdsModelDef))

// Transform a CDS Model elements object into an HTML table
const cdsElObjToHtmlTable =
  (cdsElObj, tableData) => {
    let hdrs = tableHdrs(cdsElObj)
    let rows = tableBody(cdsElObj, tableData)

    return bfu.as_table(["class='bfu-table'"], `${hdrs}${rows}`)
  }


// Look deeper into displayed objects
  bfu.set_depth_limit(7)

// ---------------------------------------------------------------------------------------------------------------------
// HTTP request error handler function
// ---------------------------------------------------------------------------------------------------------------------
const httpErrorHandler = err => console.error(err.stack)

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
      let modelDefs        = cdsModelDefinitions(cds)
      let geonamesElements = modelDefs(countryTable)

      let countriesTable = cdsElObjToHtmlTable(geonamesElements, countryList)

      let defaultResponse =
        bfu.as_html([]
        , [ bfu.as_style([], styleSheet)
          , bfu.as_body([]
            , countriesTable)
        //   , [ bfu.create_content(
        //       [ {title: "cds",              value: cds}
        //       , {title: "VCAP_SERVICES",    value: vcap_srv}
        //       , {title: "VCAP_APPLICATION", value: vcap_app}
        //       , {title: "NodeJS process",   value: process}
        //       ])
        //     ].join("")
          ]
          .join('')
        )
  
      // Create an HTTP server
      const server = http.createServer()
      
      server.listen(port, () => console.log(`Server running at https://${vcap_app.uris[0]}:${port}/`))
      server.on('request', httpRequestHandler(defaultResponse))
  
      // Pass list of countries through to the next promise
      resolve(countryList)
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

