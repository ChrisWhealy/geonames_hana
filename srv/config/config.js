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
