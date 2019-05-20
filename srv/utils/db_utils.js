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
      , isNullOrUndef
      } = require('./functional_tools.js')

const config = require('../config/config.js')

const genWsMsg = (msgType, msgCountry) => msgPayload => JSON.stringify({type: msgType, country: msgCountry, payload: msgPayload})

const columnList      = cols => cols.filter(isNotNullOrUndef)
const genColumnList   = cols => columnList(cols).join(',')
const genPlaceHolders = cols => columnList(cols).map(_ => '?').join(',')

const genUpsertFrom =
  (tabName, cols) => `UPSERT ${tabName} (${genColumnList(cols)}) VALUES (${genPlaceHolders(cols)}) WITH PRIMARY KEY`

/***********************************************************************************************************************
 * Partial function used by Array.reduce on one line of a text file to filter out unneeded columns
 * If a particular column value contains a comma, then this value must be delimited with double quotes
 */
const reduceUsingColsFrom =
  propList =>
    (acc, el, idx) =>
      isNullOrUndef(propList[idx]) ? acc : push(acc, el.indexOf(",") > -1 ? `"${el}"` : el)

/***********************************************************************************************************************
 * Writable stream handler to generate upsert statements
 */
class Upsert extends Writable {
  constructor({
    batchSize   = config.batchSize
  , tableConfig = {}
  , iso2        = ""
  , webSocket   = null
  }) {
    // Since we're extending an existing class, we must call that class's constructor
    super()

    // Initialise instance variables
    this._batchSize  = batchSize
    this._buffer     = []
    this._iso2       = iso2
    this._ws         = webSocket
    this._upsert     = genUpsertFrom(tableConfig.dbTableName, tableConfig.colNames)
    this._colReducer = reduceUsingColsFrom(tableConfig.colNames)
    this._rowCount   = 0
    this._genLogMsg  = genWsMsg("country", this._iso2)
    this._logger     = isNullOrUndef(this._ws) ? console.log : this._ws.send
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
    console.log(JSON.stringify(this._ws, null, 2))
    this._logger(this._genLogMsg(`${this._rowCount + this._buffer.length} rows written`))

    this._buffer.length > 0
    ? this._writeBufferToDb().then(() => cb())
    : cb()
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

// ---------------------------------------------------------------------------------------------------------------------
// 1) Decide which function should be used to generate the SQL statement. If the URL contains any keys then this is a
//    direct READ request which takes priority over a generic QUERY request.  This value becomes the argument passed to
//    to the first IIFE (Immediately Invoked Function Expression)
// 2) Invoke the generator function and pass the generated SQL to the nested IIFE
// 3) Use another IIFE simply as a construct to print the SQL statement to the console
// 4) console.log always returns undefined, so we simply ignore this argument value and execute the generate SQL
//    statement
const invokeApiInDb =
  (apiConfig, validatedUrl) =>
    (sqlGenFn =>
      (sql =>
        (_ => cds.run(sql).catch(console.error))
        (console.log(`Executing SQL statement ${sql}`)))
      (sqlGenFn(validatedUrl, apiConfig)))
    (validatedUrl.keys.length > 0 ? genSqlRead : genSqlQuery)

/***********************************************************************************************************************
 * Public API
 */
module.exports = {
  Upsert        : Upsert
, genUpsertFrom : genUpsertFrom
, invokeApiInDb : invokeApiInDb
}



