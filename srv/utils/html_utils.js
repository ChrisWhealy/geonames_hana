/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

/**
 * =====================================================================================================================
 * HTML Utilities
 * =====================================================================================================================
 */
const bfu = require('basic-formatting-utils')

  // Display no more than 7 levels of nested objects
  bfu.set_depth_limit(7)

const as_ul = bfu.as_html_el('ul')
const as_li = bfu.as_html_el('li')

const config     = require('../config/config.js')
const styleSheet = require('./style_sheet.js')
const { push }   = require('./functional_tools.js')

const { promiseToReadTable } = require('./db_utils.js')


// =====================================================================================================================
// Transform a table or link name from the config object into a hypertext link
const genLink = (url, text) => bfu.as_a([`href="${url}"`], text)

const urlAsLink = linkName => genLink(config.urls[linkName].url, config.urls[linkName].description)

// =====================================================================================================================
// HTTP 404 error message
const qsErrorAsListItem = qsVal => as_li([], `${qsVal.name}: ${qsVal.msg}`)

const qsErrorsAsListItems =
  qsVals =>
    qsVals
      .reduce((acc, qsVal) => qsVal.isValid ? acc : push(acc, qsErrorAsListItem(qsVal)), [])
      .join('')

const http400 =
  validatedUrl =>
    bfu.as_div(
      []
    , [ bfu.as_h2([],'HTTP 400: Bad Request')
      , bfu.as_p([], 'The following query string parameters are invalid:')
      , as_ul([], qsErrorsAsListItems(validatedUrl.qsVals))
      ].join('')
    )


// =====================================================================================================================
// Return an HTML span element containing some text and a mouseover description
const asSpanWithDesc = (txt, desc) => bfu.as_span([`title="${desc}"`], txt)

// =====================================================================================================================
// Return an HTML td element containing some value from the HANA table
const asTableData = tdValue => bfu.as_td(["class='bfu-td'"], tdValue)

// =====================================================================================================================
// Retrieve the elements of a given table from the CDS model
// If the table name cannot be found, return an empty array
const cdsModelDefinitions =
  cdsObj =>
    tabName =>
      (tab => tab === undefined ? [] : tab.elements)
      (cdsObj.model.definitions[tabName])

// =====================================================================================================================
// Take the cds.model.definitions["<some_table_name>"].elements object and convert each property value into an array
// of property element objects, then sort that array into column index number order
// This transformation loses the case-sensitive name defined in the orginal CDS file, but preserves the uppercase names
// used in the HANA database (in property "@cds.persistence.name")
const sortModelElements =
  elementObj =>
    Object
      .keys(elementObj)
      .reduce((acc, element) => push(acc, elementObj[element]), [])
      .sort((el1, el2) => el1.indexNo - el2.indexNo)

// =====================================================================================================================
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
                              // If the description is missing, then use the OData foreign key property instead
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

// =====================================================================================================================
// Transform an array of objects read from a HANA table into the corresponding HTML table rows.
// The column order is defined by the indexNo property in the CDS Model elements object
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
  (cdsElObj, tableData) =>
    bfu.as_table(
      ["class='bfu-table'"]
    , `${tableHdrs(cdsElObj)}${tableBody(cdsElObj, tableData)}`
    )

// =====================================================================================================================
// Partial function to display the contents of a generic DB table
// This function always reads the DB via a promise and returns a synchronous result
const showTable =
  (dbTabName, cdsTableDef) =>
    // Return a function that will read a given table using whatever query fragment is passed as its argument.
    // Currently, there is no support for WHEN clauses
    query =>
      promiseToReadTable(dbTabName)(query)
        .then(tableContents => {
          console.log(`"${query} FROM ${dbTabName}" returned ${tableContents.length} rows`)
          return bfu.as_html(
                   []
                 , [ bfu.as_style([], styleSheet)
                   , bfu.as_body([], cdsElObjToHtmlTable(cdsTableDef, tableContents))
                   ].join('')
                 )
        })

// =====================================================================================================================
// Build the default landing page using the URLs and descriptions found in the config object
const buildLandingPage = countryCount =>
  bfu.as_html(
    []
  , bfu.as_body(
      []
    , [ bfu.as_h1([],`GeoNames Server (${process.env.NODE_ENV})`)
      , bfu.as_p([], `Provides geopolitical data for ${countryCount} countries`)

      // Display a link to the API for each table name listed in the config object
      , bfu.as_h2([], 'Tables')
      , Object.keys(config.urls).map(apiName => bfu.as_p([], urlAsLink(apiName))).join('')

      // Display each URL of type 'link' listed in the config object
      , bfu.as_h2([], 'Links')
      , Object
          .keys(config.urls)
          .reduce((acc, url) => (config.urls[url].type === 'link') ? push(acc, url) : acc, [])
          .map(linkName => bfu.as_p([], urlAsLink(linkName)))
          .join('')
      ].join('')
    )
  )

// =====================================================================================================================
// Display the contents of various server-side object.
// This function should only be used when the evironment variable NODE_ENV is set to 'development'
const showServerObjects =
  objectList => bfu.as_html([], bfu.create_content(objectList))

// =====================================================================================================================
// Generate a dummy administration screen
const genAdminScreen = () => {
  let refreshButton = bfu.as_button([], 'Refresh')

  return bfu.as_html([], [ bfu.as_style([], styleSheet), refreshButton].join(''))
}

// =====================================================================================================================
// Return a handler that generates the appropriate page for a given link.
const showLink =
  (url, serverSideObjectList) => {
    let response =
      (url === '/admin')
      ? genAdminScreen()
      : (url === '/debug')
        ? showServerObjects(serverSideObjectList)
        : bfu.as_html([], `Here's the page for ${url}` )

    // Return a function, that when executed, return a Promise containing the required response
    return () => {
      return new Promise((resolve, reject) => resolve(response))
    }
}


/**
 * ---------------------------------------------------------------------------------------------------------------------
 *  Public API
 * ---------------------------------------------------------------------------------------------------------------------
 */
module.exports = {
  cdsElObjToHtmlTable : cdsElObjToHtmlTable
, cdsModelDefinitions : cdsModelDefinitions
, showTable           : showTable
, showLink            : showLink
, http400             : http400
, genLink             : genLink
, buildLandingPage    : buildLandingPage
}


