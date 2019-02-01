/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

const config = {
  development : {
    environment    : "development"
  , refresh_freq   : "daily"
  , copy_csv_files : true
  , csv_src_path   : "'../../db/src/csv/'"
  , csv_dest_path  : "./config/"
  , csv_files      : ["CountryInfo.csv"]
  }
, production : {
    environment    : "production"
  , refresh_freq   : "daily"
  , copy_csv_files : true
  , csv_src_path   : "'../../db/src/csv/'"
  , csv_dest_path  : "./config/"
  , csv_files      : ["CountryInfo.csv"]
  }
}

module.exports = config[process.env.NODE_ENV || 'development']
