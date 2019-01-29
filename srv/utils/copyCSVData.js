#!/usr/bin/env node

/**
 * =====================================================================================================================
 * Copy CSV files from the design time db/src/csv folder in srv/src/csv
 * =====================================================================================================================
 **/

const fs     = require('fs')
const path   = require('path')
const config = require('../config/config.js')

const src_folder  = path.join(__dirname, '../../db/src/csv/')
const dest_folder = path.join(__dirname, '../src/csv/')

const ensureDir = dirname => fs.existsSync(dirname) ? undefined : fs.mkdirSync(dirname)

/**
 * ---------------------------------------------------------------------------------------------------------------------
 * Do we need to copy anything?
 */
config.copy_csv_files
? (() => {
    console.log(`Copying ${config.csv_files}`)
    ensureDir(dest_folder)
    config.csv_files.map(filename => fs.copyFileSync(path.join(src_folder, filename), path.join(dest_folder, filename)))
  })()
: console.log(`CSV file copy switched off in configuration`)



