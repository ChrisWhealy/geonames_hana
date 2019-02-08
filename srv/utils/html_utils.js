/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

/**
 * =====================================================================================================================
 * HTML Utilities
 * =====================================================================================================================
 */
const bfu = require('basic-formatting-utils')

const config     = require('../config/config.js')
const styleSheet = require('./style_sheet.js')
const { push }   = require('./functional_tools.js')

const { promiseToReadTable } = require('./db_utils.js')


// =====================================================================================================================
// Transform a table or link name from the config object a hypertext link
const genLink = section => bfu.as_a([`href="${section.url}"`], section.description)

const tabNameAsLink  = tabName  => genLink(config.tables[tabName])
const linkNameAsLink = linkName => genLink(config.links[linkName])

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

      // Display each table name listed in the config object
      , bfu.as_h2([], `Tables`)
      , Object.keys(config.tables).map(tabName => bfu.as_p([], tabNameAsLink(tabName))).join('')

      // Display each link name listed in the config object
      , bfu.as_h2([], `Links`)
      , Object.keys(config.links).map(linkName => bfu.as_p([], linkNameAsLink(linkName))).join('')
      ].join('')
    )
  )

// =====================================================================================================================
// Return a handler that displays the contents of various server-side object.
// This function should only be used when the evironment variable NODE_ENV is set to 'development'
const showServerObjects =
  objectList =>
    () => {
      return new Promise((resolve, reject) =>
        resolve(bfu.as_html([], bfu.create_content(objectList)))
      )}


// =====================================================================================================================
// Return a handler that generates the appropriate page for a given link.
const showLink =
  url =>
    () => {
      return new Promise((resolve, reject) => {
        let response = bfu.as_html([], "Here's the page you're looking for")

        resolve(response)
      })
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
, buildLandingPage    : buildLandingPage
, showServerObjects   : showServerObjects
}


