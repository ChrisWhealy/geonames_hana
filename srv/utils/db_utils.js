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

const {
  isNotNullOrUndef
, reduceUsing } = require('./functional_tools.js')

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

/***********************************************************************************************************************
 * Public API
 */
module.exports = {
  Upsert             : Upsert
, TableMetadata      : TableMetadata
, genUpsertFrom      : genUpsertFrom
, promiseToReadTable : promiseToReadTable
}



