/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

// API version number that must appear after the hostname at the start of all API requests
const apiVersionPrefix = '/api/v1/'

// DB refresh period in minutes
const refreshFrequency = 1440

// Number of rows to write to HANA in a single batch
const hanaWriteBatchSize = 20000

// Return no more than this number of rows from a generic query
const rowLimit = 1000

/**
 * =====================================================================================================================
 * Map the operators accepted in the URL query string to the corresponding operators required by SQL
 * =====================================================================================================================
 */
const like           = 'LIKE'
const simpleEquality = '='

const numericOperatorsMap = new Map()

  numericOperatorsMap.set ('=',   '=')
  numericOperatorsMap.set ('>',   '>')
  numericOperatorsMap.set ('<',   '<')
  numericOperatorsMap.set ('>=',  '>=')
  numericOperatorsMap.set ('<=',  '<=')
  numericOperatorsMap.set ('EQ',  '=')
  numericOperatorsMap.set ('GT',  '>')
  numericOperatorsMap.set ('LT',  '<')
  numericOperatorsMap.set ('GTE', '>=')
  numericOperatorsMap.set ('LTE', '<=')

  numericOperatorsMap.toString = function() {
    let acc = []
    this.forEach((_,k) => acc.push(`"${k}"`))
    return `${acc.join(', ')}`
  }

/**
 * =====================================================================================================================
 * Public API
 * =====================================================================================================================
 */
module.exports = {
  like                : like
, rowLimit            : rowLimit
, simpleEquality      : simpleEquality
, numericOperatorsMap : numericOperatorsMap
, apiVersionPrefix    : apiVersionPrefix
, refreshFrequency    : refreshFrequency
, hanaWriteBatchSize  : hanaWriteBatchSize
}

