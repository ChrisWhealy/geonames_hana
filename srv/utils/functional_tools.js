/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

/**
 * =====================================================================================================================
 * Utilities for functional programming in JavaScript
 * =====================================================================================================================
 */

const push    = (arr, el) => (_ => arr)(arr.push(el))
const unshift = (arr, el) => (_ => arr)(arr.unshift(el))

// Add or overwrite property 'p' in 'obj' with value 'v'
const updateObj = (obj, p, v) => (_ => obj)(obj[p] = v)

// *********************************************************************************************************************
// Discover what data type the object itself thinks it has - as opposed to the data type JavaScript thinks it has
const typeOf = x => Object.prototype.toString.apply(x).slice(8).slice(0, -1)

// Partial function that creates a function to check for a specific data type
const isOfType = t => x => typeOf(x) === t

// Primitive type identifiers
const isNull      = isOfType("Null")
const isUndefined = isOfType("Undefined")
const isNumber    = isOfType("Number")
const isBigInt    = isOfType("BigInt")
const isSymbol    = isOfType("Symbol")
const isArray     = isOfType("Array")
const isMap       = isOfType("Map")
const isSet       = isOfType("Set")
const isString    = isOfType("String")
const isFn        = isOfType("Function")
const isGenFn     = isOfType("GeneratorFunction")
const isJsObject  = isOfType("Object")

// The NodeJS objects 'global' and 'process' return their own names when asked their type even though they are just
// regular objects
const isNodeJsProcess = isOfType("process")
const isNodeJsGlobal  = isOfType("global")

// Disjunctive type identifiers
const isNullOrUndef = x => isNull(x)     || isUndefined(x)
const isNumeric     = x => isNumber(x)   || isBigInt(x)
const isFunction    = x => isFn(x)       || isGenFn(x)
const isObject      = x => isJsObject(x) || isNodeJsProcess(x) || isNodeJsGlobal(x)

const isNotNullOrUndef = x => !isNullOrUndef(x)


/***********************************************************************************************************************
 * Partial function that can be used with Array.reduce on one line of a text file to filter out unneeded columns
 * If a particular column value contains a comma, then this value must be delimited with double quotes
 */
const reduceUsing =
  propList =>
    (acc, el, idx, array) =>
      isNullOrUndef(array[idx]) ? acc : push(acc, el.indexOf(",") > -1 ? `"${el}"` : el)


// *********************************************************************************************************************
//                                                        Public API
// *********************************************************************************************************************
module.exports = {
  // Array handlers
  push    : push
, unshift : unshift

  // Datatype identifiers
, typeOf           : typeOf
, isOfType         : isOfType
, isArray          : isArray
, isBigInt         : isBigInt
, isFunction       : isFunction
, isMap            : isMap
, isNull           : isNull
, isNullOrUndef    : isNullOrUndef
, isNotNullOrUndef : isNotNullOrUndef
, isNumber         : isNumber
, isNumeric        : isNumeric
, isObject         : isObject
, isSet            : isSet
, isString         : isString
, isSymbol         : isSymbol
, isUndefined      : isUndefined

  // Object handlers
, updateObj        : updateObj
, reduceUsing      : reduceUsing
}


