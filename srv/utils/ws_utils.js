/*eslint semi: ["error", "never"], no-console:0, no-nested-ternary:0 */
/*eslint no-unused-expressions: ["error", { "allowTernary": true }]*/
/*eslint-env node, es6 */

/**
 * =====================================================================================================================
 * WebSocket message handlers
 * =====================================================================================================================
 **/

// Partial function to generate a message object of a particular type for a particular country
const genWsMsg =
  (msgType, msgCountry) =>
    msgPayload =>
      JSON.stringify({
        type    : msgType
      , country : msgCountry
      , payload : msgPayload
      })


/***********************************************************************************************************************
 * Public API
 */
module.exports = {
  genWsMsg : genWsMsg
}

