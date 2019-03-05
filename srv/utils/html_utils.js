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
// Build the default landing page using the URLs and descriptions found in the config object
const genLinksForUrlsOfType =
  linkType =>
    Object
      .keys(config.urls)
      .reduce((acc, url) => (config.urls[url].type === linkType) ? push(acc, url) : acc, [])
      .map(linkName => bfu.as_p([], urlAsLink(linkName)))
      .join('')

const buildLandingPage = countryCount =>
  bfu.as_html(
    []
  , bfu.as_body(
      []
    , [ bfu.as_h1([],`GeoNames Server (${process.env.NODE_ENV})`)
      , bfu.as_p([], `Provides geopolitical data for ${countryCount} countries`)

      // Display a link to the API for each table name listed in the config object
      , bfu.as_h2([], 'Tables')
      , genLinksForUrlsOfType('api')

      // Display each URL of type 'link' listed in the config object
      , bfu.as_h2([], 'Links')
      , genLinksForUrlsOfType('link')
      ].join('')
    )
  )

// =====================================================================================================================
// Display the contents of various server-side object.
// This function should only be used when the evironment variable NODE_ENV is set to 'development'
const showServerObjects = objectList => bfu.as_html([], bfu.create_content(objectList))

// =====================================================================================================================
// Generate a dummy administration screen
const genAdminScreen = () => bfu.as_html([], [ bfu.as_style([], styleSheet), bfu.as_button([], 'Refresh')].join(''))

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
  showLink            : showLink
, http400             : http400
, buildLandingPage    : buildLandingPage
}


