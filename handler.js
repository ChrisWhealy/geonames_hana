#!/usr/bin/env node

/**
 * =====================================================================================================================
 * Stream handler for very large text and CSV files
 * =====================================================================================================================
 */

const stream = require('stream')
const fs     = require('fs')

const txt_path = './db/src/txt/'

class StreamHandler extends stream.Writable {
  constructor(opts)  {
    super(opts)
  }

  _write(chunk,encoding,cb) {
    process.stdout.write('.')
    cb()
  }
}

let fileStream = fs.createReadStream(`${txt_path}US.txt`)
let fileHandler = new StreamHandler()

fileStream.pipe(fileHandler)

fileStream.on('end',    () => console.log('Stream finished reading'))
fileStream.on('finish', () => console.log('Stream finished writing'))

