/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

/**
 * =====================================================================================================================
 * Utilities for managing URLs and query string validation
 * =====================================================================================================================
 */
const { isString
      , updateObj
      , push
      } = require('./functional_tools.js')

// ---------------------------------------------------------------------------------------------------------------------
// Class for parsed/validated URL
// ---------------------------------------------------------------------------------------------------------------------
class ValidatedUrl {
  constructor({dbProps = {}, qsVals  = [], keys = [], qs = {}}) {
    this.dbProps = dbProps
    this.qsVals  = qsVals
    this.keys    = keys
    this.qs      = qs
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Class for parsed/validated query string parameter
// After the query string has been parsed, all subsequent functions that handle this parsed data are expected to handle
// objects of this type
// ---------------------------------------------------------------------------------------------------------------------
class ParsedQsParameter {
  constructor({isValid = true, name = '', operator = '', value = '', msg = ''}) {
    this.isValid  = isValid
    this.name     = name
    this.operator = operator
    this.value    = value
    this.msg      = msg
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Parse a query string value on the basis that it might contain a value such as "(GT,5000)" or "(<=,10000)"
// If valid, this should be a pair of values where the first is numeric operator, then a comma, then a numeric value.
// This value should be enclosed in parentheses
// No attempt here is made to validate the query string parameter values
// ---------------------------------------------------------------------------------------------------------------------
const parseQsValue =
  qsVal =>
    ((openIdx, closeIdx) =>
       // Minimal check to ensure that both open & close parenthesis characters are present
       // If this assumption turns out to be correct, then attempt to split the value at the assumed comma
       (openIdx !== -1 && closeIdx !== -1)
       ? qsVal.substring(openIdx + 1, closeIdx).split(',')
       : qsVal)
    (qsVal.indexOf('('), qsVal.indexOf(')'))

// ---------------------------------------------------------------------------------------------------------------------
// Get query string parameters from incoming request object
// Just for a giggle, I wrote this function such that it only ever uses single expressions; hence no internal variables
// are declared.  Instead, anonymous inner functions are used and any needed internal variables become function
// parameters whose values are bound when the function is called
// ---------------------------------------------------------------------------------------------------------------------
const fetchQsParams =
  qs =>
    qs.split('&')
      .reduce((acc, item) =>
        (eqIdx =>
          eqIdx === -1
          ? updateObj(acc, item, '')
          : updateObj(acc, item.substr(0, eqIdx), parseQsValue(item.substr(eqIdx+1)))
        )
        (item.indexOf('=')), {})

// ---------------------------------------------------------------------------------------------------------------------
// Subdivide the URL into zero or more keys and zero or more query string parameters
// ---------------------------------------------------------------------------------------------------------------------
const subdivideUrl =
  (requestUrl, templateUrl) =>
    (urlParts => ({
        // Split up the first part of the URL at the slash characters
        // This will return an array containing at least one element
        keys : urlParts[0]
                 .replace(templateUrl,'')
                 .split('/')
                 .filter(el => el.length > 0)
        // If the urlParts array has a length of two, then the query string values should be found in the second element 
      , qs   : (urlParts.length === 2)
               ? fetchQsParams(urlParts[urlParts.length - 1])
               : {}
      })
    )
    // Split the URL at the '?', if there is one.
    // This will always result in an array containing at least one element
    (requestUrl.split('?'))

// ---------------------------------------------------------------------------------------------------------------------
// Check that the name/value pair in a single query string parameter matches the permitted operators
// This partial function returns a function suitable for use with Array.prototype.reduce
// ---------------------------------------------------------------------------------------------------------------------
const operatorErrorMsg =
  (configParam, badOp) =>
    `Operator(s) permitted for ${configParam.colName} is/are ${configParam.operators}, not "${badOp}"`

const validateNameValuePair =
  (configParams, qs) =>
    (acc, paramName) =>
      // Self-executing inner function
      ((configParam, qsParamName) => {
        // If the permitted parameter does not exist in the query string, then ignore it and simply return the accumulator
        if (qsParamName) {
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          // Is the valid list of operators a string rather than an array?
          if (isString(configParam.operators)) {
            // Yup, is the query string parameter value also a string
            if (isString(qsParamName)) {
              // Yup, so return the simple case value
              push(acc, new ParsedQsParameter({
                  name     : paramName
                , operator : configParam.operators
                , value    : qsParamName
                })
              )
            }
            else {
              // Nope, so the query string value must be an array containing firstly the operator and secondly the value
              // This is a somewhat redundant case since we already know that the valid list of operators is just a
              // string.  Nonetheless, the first element of query string value array must still equal the one permitted
              // operator value held in that string
              if (configParam.operators === qsParamName[0]) {
                push(acc, new ParsedQsParameter({
                    name     : paramName
                  , operator : qsParamName[0]
                  , value    : qsParamName[1]
                  })
                )
              }
              else {
                // The caller is trying to use an operator that is not permitted for this qs value
                let errMsg = operatorErrorMsg(configParam, qsParamName[0])
                console.log(errMsg)
                push(acc, new ParsedQsParameter({
                    name    : paramName
                  , isValid : false
                  , msg     : errMsg
                  })
                )
              }
            }
          }
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          else {
            // Nope, so the list of permitted operators must be a Map
            if (isString(qsParamName)) {
              // If a Map of operators is permitted, but the query string value is just a string, then assume the
              // operator must be '='
              push(acc, new ParsedQsParameter({
                    name     : paramName
                  , operator : '='
                  , value    : qsParamName
                  })
              )
            }
            else {
              // The query string value is an array and the operators value is a Map, so check that the operator listed
              // in the query string is a permitted operator listed in the 'operators' array
              if (configParam.operators.has(qsParamName[0])) {
                push(acc, new ParsedQsParameter({
                    name     : paramName
                  , operator : configParam.operators.get(qsParamName[0])
                  , value    : qsParamName[1]
                  })
                )
              }
              else {
                // The caller is trying to use an operator that is not permitted for this qs value
                let errMsg = operatorErrorMsg(configParam, qsParamName[0])
                console.log(errMsg)
                push(acc, new ParsedQsParameter({
                    name    : paramName
                  , isValid : false
                  , msg     : errMsg
                  })
                )
              }
            }
          }
        }

        return acc
      }
    )
    // Pass the details of the permitted parameter and the current parameter to the inner function above
    (configParams[paramName], qs[paramName])

// ---------------------------------------------------------------------------------------------------------------------
// Validate the query string parameters.  Each query string name/value pair is proceesed by the partial function above
const validateQsValues =
  (configParams, qs) =>
    Object
      .keys(configParams)
      .reduce(validateNameValuePair(configParams, qs), [])

// ---------------------------------------------------------------------------------------------------------------------
// For a given paramater object, return the DB table column names and operators values that correspond to the query
// string parameter names
// ---------------------------------------------------------------------------------------------------------------------
const qsNameToDbProperties =
  (paramObj, qs, targetObj) =>
    Object
      .keys(paramObj)
      .reduce((acc, el) => qs[el] ? updateObj(acc, el, paramObj[el]) : acc, targetObj)

// ---------------------------------------------------------------------------------------------------------------------
// Validate the subdivided URL
// This function gives back everything needed either to process the request or reject it with an appropriate reason
// ---------------------------------------------------------------------------------------------------------------------
const validateUrl =
  (recognisedUrlConfig, requestUrl) =>
    (subdividedUrl => {
      return new ValidatedUrl({
        // Transform the query string parameter names into the corresponding table column names
        dbProps : qsNameToDbProperties(recognisedUrlConfig.parameters, subdividedUrl.qs, {})
    
        // Check that the query string values match the permitted operators
      , qsVals  : validateQsValues(recognisedUrlConfig.parameters, subdividedUrl.qs, {})
    
        // Pass the raw URL keys and query string back directly
      , keys    : subdividedUrl.keys
      , qs      : subdividedUrl.qs
      })
    })
    (subdivideUrl(requestUrl, recognisedUrlConfig.url))



/**
 * ---------------------------------------------------------------------------------------------------------------------
 *  Public API
 * ---------------------------------------------------------------------------------------------------------------------
 */
module.exports = {
  validateUrl  : validateUrl
}

