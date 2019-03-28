/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

const settings      = require('./config_settings.js')
const { updateObj } = require('../utils/functional_tools.js')

/**
 * =====================================================================================================================
 * Partial function to merge the properties of an incoming object into a base object
 * If the incoming object contains a property that is already present in the base object, then the base object's
 * property value is simply overwritten
 * =====================================================================================================================
 */
const mergeProperties =
  baseObj =>
    incomingObj =>
      Object.keys(incomingObj).reduce(
        (acc, prop) => (_ => acc)(acc[prop] = incomingObj[prop])
      , baseObj
      )

/**
 * =====================================================================================================================
 * Define the API structure
 * =====================================================================================================================
 */
const apiNames = [
  'alternate-names', 'continents', 'countries'
, 'feature-classes', 'feature-codes'
, 'geonames', 'languages', 'timezones'
]

// Build the API config object from the list of API names
const api_v1 = apiNames.reduce(
  (acc, apiName) => updateObj(acc, `${settings.apiVersionPrefix}${apiName}`, require(`./${apiName}.js`))
, {}
)

/**
 * =====================================================================================================================
 * In Development and Production, the server will respond to the following URLs
 * 
 * The prod_links object is available in both DEV and PROD environments
 * The dev_links object is added to the links defined in prod_links
 * =====================================================================================================================
 */
const dev_links = {
  '/debug' : {
    url         : '/debug'
  , type        : 'link'
  , description : 'Show server-side object contents'
  , handler     : null
  }
}

const prod_links = {
  '/admin' : {
    url         : '/admin'
  , type        : 'link'
  , description : 'Server admin'
  , handler     : null
  }
}

var mergeIntoApis = mergeProperties(api_v1)
var prodUrls      = mergeIntoApis(prod_links)

/**
 * =====================================================================================================================
 * This configuration object comes in a 'development' and 'production' version.
 * The version exported from this module is determined by the Node environment in which this app is deployed
 * =====================================================================================================================
 */
const config = {
  // ===================================================================================================================
  // Configuration settings applicable for a development environment
  // ===================================================================================================================
  development : {
    environment      : "development"
//  , urls             : mergeProperties(prodUrls)(dev_links)
  , urls             : prodUrls
  , batchSize        : settings.hanaWriteBatchSize
  , refresh_freq     : settings.refreshFrequency
  , genericRowLimit  : settings.rowLimit
  , apiVersionPrefix : settings.apiVersionPrefix
  }

  // ===================================================================================================================
  // Configuration settings applicable for a production environment
  // ===================================================================================================================
, production : {
    environment      : "production"
  , urls             : prodUrls
  , batchSize        : settings.hanaWriteBatchSize
  , refresh_freq     : settings.refreshFrequency
  , genericRowLimit  : settings.rowLimit
  , apiVersionPrefix : settings.apiVersionPrefix
  }
}

// =====================================================================================================================
// Public API
// =====================================================================================================================

// Sometimes its necessary to force the use of development mode, even though you're running in an environment configured
// to be production
//module.exports = config[process.env.NODE_ENV || 'development']
module.exports = config['development']
