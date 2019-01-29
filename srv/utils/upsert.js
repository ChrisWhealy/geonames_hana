/**
 * =====================================================================================================================
 * @fileOverview Generate the UPSERT statement needed for a batch of rows
 * =====================================================================================================================
 **/

const { Writable } = require('stream')
const cds = require('@sap/cds')

/***********************************************************************************************************************
 * Useful functions
 **/
const push             = (arr, el) => (_ => arr)(arr.push(el))
const isNullOrUndef    = x         => x === null || x === undefined
const isNotNullOrUndef = x         => !isNullOrUndef(x)

/***********************************************************************************************************************
 * Partial function that can be used with Array.reduce on one line of a text file to filter out unneeded columns
 * If a particular column value contains a comma, then this value must be delimited with double quotes
 */
const reduceUsing =
  propList =>
    (acc, el, idx) =>
      isNullOrUndef(propList[idx]) ? acc : push(acc, el.indexOf(",") > -1 ? `"${el}"` : el)

/***********************************************************************************************************************
 * Upsert stream handler
 */
class Upsert extends Writable {
  constructor({batchSize = 1000, columns = [], tableName = ""}) {
    super()

    this._batchSize = batchSize
    this._columns   = columns
    this._tabName   = tableName
    this._buffer    = []

    // dump to be used SQL to console
    console.log(this._upsert())
  }

  _write(chunk, encoding, cb) {
    this._buffer.push(this._chunkToRowArray(chunk))

    if (this._buffer.length < this._batchSize) {
      cb()
    }
    else {
      this._writeToDb()
          .then(() => cb())
    }
  }

  _chunkToRowArray(chunk) {
    return chunk
      .toString()
      .split(/\t/)
      .reduce(reduceUsing(this._columns),[])
  }

  _columnsList() {
    return this._columns.filter(isNotNullOrUndef).join(',')
  }

  _placeholders() {
    return this._columns.filter(isNotNullOrUndef).map(e => '?').join(',')
  }

  _upsert() {
    return `UPSERT ${this._tabName} (${this._columnsList()}) VALUES (${this._placeholders()}) WITH PRIMARY KEY`
  }

  _writeToDb() {
    console.log(`Writing ${this._buffer.length} rows to HANA`)
    return cds.run(this._upsert(), this._buffer.splice(0)).catch(console.error)
  }

  _final(cb) {
    console.log('Final')

    // Flush the buffer if necessary
    if (this._buffer.length > 0) {
      this._writeToDb()
          .then(() => cb())
    }
    else {
      cb()
    }
  }
}

/***********************************************************************************************************************
 * Public API
 */
module.exports = Upsert
