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

// Class for parsed/validated query string parameter
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
// Parse a query string value
// No attempt here is made to validate the query string parameter value
// ---------------------------------------------------------------------------------------------------------------------
const parseQsValue =
  qsVal =>
    ((openIdx, closeIdx) =>
       // Minimal check to ensure that both open & close parenthesis characters are present
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
    qs.split('&').reduce((acc, item) =>
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
        keys    : urlParts[0].replace(templateUrl,'').split('/').filter(el => el.length > 0)
      , qs      : (urlParts.length === 2)
                  ? fetchQsParams(urlParts[urlParts.length - 1])
                  : {}
      })
    )
    // Split the URL at the '?', if there is one.
    // This will always result in an array containing at least one element
    (requestUrl.split('?'))

// ---------------------------------------------------------------------------------------------------------------------
// Check that the query string property value match the permitted operators
// ---------------------------------------------------------------------------------------------------------------------
const validateQsValues =
  (configParams, qs) => {
    console.log(`validateQsValues: qs = ${JSON.stringify(qs)}`)

    return Object
      .keys(configParams)
      .reduce((acc, paramName) => {
        let configParam = configParams[paramName]
        // console.log(`validateQsValues: Checking for permitted parameter ${paramName}`)

        if (qs[paramName]) {
        //   console.log(`validateQsValues: Permitted operators for ${paramName} = ${JSON.stringify(configParam)}`)
          // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          // Is the valid list of operators a string rather than an array?
          if (isString(configParam.operators)) {
            // Yup, is the query string parameter value also a string
            if (isString(qs[paramName])) {
              // Yup, so return the simple case value
              push(acc, new ParsedQsParameter({
                  name     : paramName
                , operator : configParam.operators
                , value    : qs[paramName]
                })
              )
            }
            else {
              // Nope, so the query string value must be an array containing firstly the operator and secondly the value
              // This is a somewhat redunadant case since the valid list of operators is just a string.  Nonetheless, the 
              // first element of query string value array must equal this one permitted operator value
              if (configParam.operators === qs[paramName][0]) {
                push(acc, new ParsedQsParameter({
                    name     : paramName
                  , operator : qs[paramName][0]
                  , value    : qs[paramName][1]
                  })
                )
              }
              else {
                let errMsg = `Error: Only operator "${configParam.operators}" is permitted for ${configParam.colName}, not "${qs[paramName][0]}"`
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
            if (isString(qs[paramName])) {
              // If a Map of operators is permitted, but the query string value is just a string, then assume the
              // operator must be '='
              push(acc, new ParsedQsParameter({
                  name     : paramName
                , operator : '='
                , value    : qs[paramName]
                })
              )
            }
            else {
              // The query string value is an array and the operators value is a Map, so check that the operator listed
              // in the query string is a permitted operator listed in the 'operators' array
              if (configParam.operators.has(qs[paramName][0])) {
                push(acc, new ParsedQsParameter({
                    name     : paramName
                  , operator : configParam.operators.get(qs[paramName][0])
                  , value    : qs[paramName][1]
                  })
                )
              }
              else {
                let errMsg = `Error: Operator ${qs[paramName][0]} not permitted. Valid operators are [${JSON.stringify(configParam.operators)}]`
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
      }, [])
  }

// ---------------------------------------------------------------------------------------------------------------------
// For a given paramater object, return the DB table column names and operators values that correspond to the query
// string parameter names
// ---------------------------------------------------------------------------------------------------------------------
const qsNameToDbProperties =
  (paramObj, qs, targetObj) =>
    Object.keys(paramObj).reduce(
      (acc, el) => qs[el] ? updateObj(acc, el, paramObj[el]) : acc
    , targetObj
    )


// ---------------------------------------------------------------------------------------------------------------------
// Validate the subdivided URL
// This function gives back everything needed either to process the request or reject it with an appropriate reason
// ---------------------------------------------------------------------------------------------------------------------
const validateUrl =
  (apiConfig, subdividedUrl) => {
    return {
      // Transform the query string parameter names into the corresponding table column names
      dbProps : qsNameToDbProperties(apiConfig.parameters, subdividedUrl.qs, {})

      // Check that the query string values match the permitted operators
    , qsVals  : validateQsValues(apiConfig.parameters, subdividedUrl.qs, {})

      // Pass the raw URL keys and query string back directly
    , keys    : subdividedUrl.keys
    , qs      : subdividedUrl.qs
    }
  }


/**
 * ---------------------------------------------------------------------------------------------------------------------
 *  Public API
 * ---------------------------------------------------------------------------------------------------------------------
 */
module.exports = {
  validateUrl  : validateUrl
, subdivideUrl : subdivideUrl
}

