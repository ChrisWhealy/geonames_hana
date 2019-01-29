#!/usr/bin/env node

/**
 * =====================================================================================================================
 * Copy CSV files from the design time db/src/csv folder in srv/src/csv
 * =====================================================================================================================
 **/

const fs     = require('fs')
const path   = require('path')
const config = require('../config/config.js')

const src_folder  = path.join(__dirname, config.csv_src_path)
const dest_folder = path.join(__dirname, config.csv_dest_path)

const ensureDir = dirname => fs.existsSync(dirname) ? undefined : fs.mkdirSync(dirname)

/**
 * ---------------------------------------------------------------------------------------------------------------------
 * Do we need to copy anything?
 */
  if (config.copy_csv_files) {
    console.log(`Copying ${config.csv_files}`)
    ensureDir(dest_folder)
    config.csv_files.map(filename => fs.copyFileSync(path.join(src_folder, filename), path.join(dest_folder, filename)))
  }
  else {
    console.log(`CSV file copy switched off in configuration`)
  }

