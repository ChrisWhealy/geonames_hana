const push = (arr, el) => (_ => arr)(arr.push(el))

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


module.exports = {
  push  : push

, isNullOrUndef    : isNullOrUndef
, isNotNullOrUndef : isNotNullOrUndef

, reduceUsing : reduceUsing
}