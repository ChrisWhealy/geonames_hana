#!/usr/bin/env node

/**
 * =====================================================================================================================
 * @fileOverview stream_to_csv
 * 
 * Convert a read stream containing a tab delimited text file to a corresponding CSV file with optional mapping omit
 * certain columns
 * =====================================================================================================================
 **/

// Useful versions of Array.push and Array.unshift
const push    = (arr, el) => (_ => arr)(arr.push(el))
const unshift = (arr, el) => (_ => arr)(arr.unshift(el))

// Reject null or undefined entries
const notNullOrUndef = el => el !== null && el !== undefined

/***********************************************************************************************************************
 * Transform a TXT file into a CSV file
 * Any columns in the text file containing commas but be delimited with double quote characters
 */
const transform = (fileContents, propList) => {
  // Split the file contents into an array of lines
  var csv_data = fileContents.split(/\r?\n/)
    // For each line in the array
    .map(line =>
      // Is this an empty line?
      (line.length > 0)
      // Nope, so split the line into an array of columns at every tab character
      ? line.split(/\t/)
            // Push only the required columns into the accumulator checking first for embedded commas
            .reduce(
                (acc, el, idx) => propList[idx] === undefined ? acc : push(acc, el.indexOf(",") > -1 ? `"${el}"` : el)
              , [])
            // Join the columns into a comma-separated string
            .join(",")
      // Yup, so return null
      : null
    )
    // Filter out null entries
    .filter(notNullOrUndef)

  // Add a CSV column heading line to the start array, then jjoin all the lines back into a character string
  return unshift(csv_data, propList.filter(notNullOrUndef).join(",")).join("\r")
}

// =====================================================================================================================
// Public API
// =====================================================================================================================
module.exports.transform = transform
