/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

/**
 * =====================================================================================================================
 * Generate various statements needed for accessing HANA
 * =====================================================================================================================
 **/

const { Writable } = require('stream')
const cds          = require('@sap/cds')

const { isNotNullOrUndef
      , push
      , reduceUsing
      } = require('./functional_tools.js')

const config = require('../config/config.js')

const columnList      = cols => cols.filter(isNotNullOrUndef)
const genColumnList   = cols => columnList(cols).join(',')
const genPlaceHolders = cols => columnList(cols).map(_ => '?').join(',')

// Read a generic DB table
const promiseToReadTable = tableName => query => cds.run(`${query} FROM ${tableName}`).catch(console.error)

const genUpsertFrom =
  (tabName, cols) => `UPSERT ${tabName} (${genColumnList(cols)}) VALUES (${genPlaceHolders(cols)}) WITH PRIMARY KEY`

/***********************************************************************************************************************
 * Writable stream handler to generate upsert statements
 */
class Upsert extends Writable {
  constructor({
    batchSize = 20000
  , dbTableData = {tableName : "", colNames : []}
  , iso2 = ""}) {
    super()

    // Initialise instance variables
    this._batchSize    = batchSize
    this._buffer       = []
    this._iso2         = iso2
    this._upsert       = genUpsertFrom(dbTableData.tableName, dbTableData.colNames)
    this._colReducer   = reduceUsing(dbTableData.colNames)
    this._rowCount     = 0
  }

 // Put each row to the buffer.  Then when the buffer is full, dump it to HANA
  _write(chunk, _encoding, cb) {
    // Don't write empty chunks
    if (chunk.length > 0) {
      this._buffer.push(this._chunkToRowArray(chunk))
    }

    // If the buffer is full then dump it to HANA. Either way, invoke the callback function
    this._buffer.length < this._batchSize
    ? cb()
    : this._writeBufferToDb().then(() => cb())
  }

 // The write stream delivers binary chunks
 // Convert a chunk to a utf8 string, split it into tab-delimited columns, then transform it into a value array
  _chunkToRowArray(chunk) {
    return chunk.toString('utf8').split(/\t/).reduce(this._colReducer,[])
  }

 // Write the buffer contents to HANA, and flush the buffer
  _writeBufferToDb() {
    this._rowCount += this._buffer.length
    return cds.run(this._upsert, this._buffer.splice(0)).catch(console.error)
  }

 // Finally, ensure there's nothing left over in the buffer
  _final(cb) {
    console.log(`Country code ${this._iso2}: ${this._rowCount + this._buffer.length} rows written`)

    this._buffer.length > 0
    ? this._writeBufferToDb().then(() => cb())
    : cb()
  }
}

/***********************************************************************************************************************
 * Basic table metadata data object
 */
class TableMetadata {
  constructor({tableName = "", colNames = []}) {
    this.tableName = tableName
    this.colNames  = colNames
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Generate generic query SQL statement
// ---------------------------------------------------------------------------------------------------------------------
const genSqlWhereClause =
  validatedUrl =>
    validatedUrl
      .qsVals
      .reduce((acc,qsVal) =>
          push(acc, `"${validatedUrl.dbProps[qsVal.name].colName}" ${qsVal.operator} '${qsVal.value}'`)
        , [])
      .join(' AND ')

const genSqlQuery =
  (validatedUrl, apiConfig) =>
    (selectPart =>
      Object.keys(validatedUrl.qsVals).length === 0
      // Then just return the number of rows defined in the generic row limit
      ? `${selectPart};`
      // Else, add a WHERE clause
      : `${selectPart} WHERE ${genSqlWhereClause(validatedUrl)};`)
    (`SELECT TOP ${apiConfig.rowLimit} * FROM ${apiConfig.dbTableName}`)

const genSqlRead =
  (validatedUrl, apiConfig) =>
    `SELECT TOP ${config.genericRowLimit} * FROM ${apiConfig.dbTableName} WHERE "${apiConfig.keyField}"='${validatedUrl.keys[0]}';`

const invokeApiInDb =
  (apiConfig, validatedUrl) =>
    (sqlGenFn =>
      (sql =>
        // 4) Execute the generate SQL statement
        (_ => cds.run(sql).catch(console.error))
        // 3) Use dummy inner function to print the SQL statement to the console
        (console.log(`Executing SQ statement ${sql}`))
        )
      // 2) Invoke the generator function and pass the generated SQL to the inner function
      (sqlGenFn(validatedUrl, apiConfig))
    )
    // 1) Decide which function should be used to generate the SQL statement. If the URL contains any keys then this is
    //    a direct READ request which takes priority over a generic QUERY request
    (validatedUrl.keys.length > 0 ? genSqlRead : genSqlQuery)

/***********************************************************************************************************************
 * Public API
 */
module.exports = {
  Upsert             : Upsert
, TableMetadata      : TableMetadata
, genUpsertFrom      : genUpsertFrom
, promiseToReadTable : promiseToReadTable
, invokeApiInDb      : invokeApiInDb
}



