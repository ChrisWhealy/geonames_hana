/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

/**
 * =====================================================================================================================
 * HTML Utilities
 * =====================================================================================================================
 */
const FS         = require('fs')
const BFU        = require('basic-formatting-utils')
const Config     = require('../config/config.js')
const { push }   = require('./functional_tools.js')
//const styleSheet = require('./style_sheet.js')

  // Display no more than 7 levels of nested objects
  BFU.set_depth_limit(7)

// =====================================================================================================================
// Transform a link name from the Config object into a hypertext link
const urlAsLink =
  linkName =>
    (linkConfig => BFU.as_a([`href="${linkConfig.url}"`], linkConfig.description))
    (Config.urls[linkName])

// =====================================================================================================================
// HTTP 404 error message
const qsErrorAsListItem = qsVal => BFU.as_li([], `${qsVal.name}: ${qsVal.msg}`)

const qsErrorsAsListItems =
  qsVals =>
    qsVals
      .reduce((acc, qsVal) => qsVal.isValid ? acc : push(acc, qsErrorAsListItem(qsVal)), [])
      .join('')

const http400 =
  validatedUrl =>
    BFU.as_div(
      []
    , [ BFU.as_h2([],'HTTP 400: Bad Request')
      , BFU.as_p([], 'The following query string parameters are invalid:')
      , BFU.as_ul([], qsErrorsAsListItems(validatedUrl.qsVals))
      ].join('')
    )

// =====================================================================================================================
// Build the default landing page using the URLs and descriptions found in the Config object
const genLinksForUrlsOfType =
  linkType =>
    Object
      .keys(Config.urls)
      .reduce((acc, url) => (Config.urls[url].type === linkType) ? push(acc, url) : acc, [])
      .map(linkName => BFU.as_p([], urlAsLink(linkName)))
      .join('')

const buildLandingPage =
  countryCount =>
    BFU.as_html(
      []
    , [ BFU.as_head([], BFU.as_link(['rel="stylesheet"', 'type="text/css"', 'href="/css/geonames.css"']))
      , BFU.as_body(
          []
        , [ BFU.as_h1([],`GeoNames Server (${process.env.NODE_ENV})`)
          , BFU.as_p([], `Provides geopolitical data for ${countryCount} countries`)
    
          // Display a link to the API for each table name listed in the Config object
          , BFU.as_h2([], 'Tables')
          , genLinksForUrlsOfType('api')
    
          // Display each URL of type 'link' listed in the Config object
          , BFU.as_h2([], 'Links')
          , genLinksForUrlsOfType('link')
          ].join('')
        )].join('')
    )

// =====================================================================================================================
// Display the contents of various server-side object.
// This function should only be used when the evironment variable NODE_ENV is set to 'development'
const showServerObjects = objectList => BFU.as_html([], BFU.show_objects(objectList))

// =====================================================================================================================
// Generate the administration screen
const genAdminScreen = () => FS.readFileSync(__dirname + '/../admin.html').toString('utf8')

// =====================================================================================================================
// Return a handler that generates the appropriate page for a given link.
const showLink =
  (url, serverSideObjectList) => {
    let response =
      (url === '/admin')
      ? genAdminScreen()
      : (url === '/debug')
        ? showServerObjects(serverSideObjectList)
        : BFU.as_html([], `Here's the page for ${url}` )

    // Return a function, that when executed, returns a Promise containing the required response
    return () => new Promise((resolve, reject) => resolve(response))
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
