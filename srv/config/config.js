/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

const config = {
  development : {
    environment    : "development"
  , refresh_freq   : 1440
  }
, production : {
    environment    : "production"
  , refresh_freq   : 1440
  }
}

module.exports = config[process.env.NODE_ENV || 'development']
