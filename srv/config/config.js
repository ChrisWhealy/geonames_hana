/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

const settings      = require('./config_settings.js')
const { updateObj } = require('../utils/functional_tools.js')

/**
 * =====================================================================================================================
 * Partial function to merge the properties of a base object with some other object that will be supplied at a later
 * point in time.
 * 
 * Neither the base object nor the incoming object are mutated
 * 
 * If the incoming object contains a property that is already present in the base object, then the copy of the base
 * object's property value in the returned object is simply overwritten
 * =====================================================================================================================
 */
const mergeProperties =
  baseObj => (copyOfBaseObj => incomingObj => Object.assign(copyOfBaseObj, incomingObj))
             (Object.assign({}, baseObj))

/**
 * =====================================================================================================================
 * Define the names permitted as API calls
 * =====================================================================================================================
 */
const apiNames = [
  'alternate-names', 'continents', 'countries', 'feature-classes', 'feature-codes', 'geonames', 'languages', 'timezones'
]

// Build the API config object from the list of API names
const api_v1 = apiNames.reduce(
  (acc, apiName) => updateObj(acc, `${settings.apiVersionPrefix}${apiName}`, require(`./${apiName}.js`))
, {}
)

  // Urls requiring a WebSocket connection
  api_v1['/ws/updateServer'] = {
    type        : 'ws'
  , url         : '/ws/updateServer'
  , description : 'Update server-side data from GeoNames.org'
  , handler     : null
  }

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
    type        : 'link'
  , url         : '/debug'
  , description : 'Show server-side object contents'
  , handler     : null
  }
}

const prod_links = {
  '/admin' : {
    type        : 'link'
  , url         : '/admin'
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
  , urls             : mergeProperties(prodUrls)(dev_links)
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

console.log(`Server is running in ${process.env.NODE_ENV} mode`)
// Sometimes its necessary to force the use of development mode, even though you're running in an environment configured
// to be production
//module.exports = config[process.env.NODE_ENV || 'development']
module.exports = config['development']
